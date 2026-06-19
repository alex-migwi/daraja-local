import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AppConfig } from "../shared/config.js";
import { loadConfig } from "../shared/config.js";
import { registerErrorHandler } from "../shared/errors.js";
import { CallbackDispatcher } from "../modules/callbacks/callback-dispatcher.js";
import { CallbackService } from "../modules/callbacks/callback.service.js";
import { C2BService } from "../modules/c2b/c2b.service.js";
import { BusinessPaymentService } from "../modules/business-payments/business-payment.service.js";
import { registerOAuthRoutes } from "../modules/oauth/oauth.routes.js";
import { StkService } from "../modules/stk/stk.service.js";
import { TransactionService } from "../modules/transactions/transaction.service.js";
import type { TransactionRepository } from "../modules/transactions/transaction.types.js";
import { MemoryTransactionRepository } from "../storage/memory/memory-transaction.repository.js";
import { registerMetadataRoutes } from "./metadata.routes.js";
import { registerBusinessPaymentRoutes } from "./business-payment.routes.js";
import { registerC2BRoutes } from "./c2b.routes.js";
import { registerSimulatorRoutes } from "./simulator.routes.js";
import { registerStkRoutes } from "./stk.routes.js";

export type ServerDependencies = {
  repository?: TransactionRepository;
  config?: Partial<AppConfig>;
};

export async function createServer(dependencies: ServerDependencies = {}) {
  const config = loadConfig(dependencies.config);
  const app = Fastify({ logger: false });
  const repository = dependencies.repository ?? new MemoryTransactionRepository();
  const transactions = new TransactionService(repository);
  const stk = new StkService(transactions);
  const dispatcher = new CallbackDispatcher(config.callbackTimeoutMs);
  const callbacks = new CallbackService(dispatcher, transactions);
  const c2b = new C2BService(transactions, dispatcher);
  const payments = new BusinessPaymentService(transactions);

  await app.register(cors);
  registerErrorHandler(app);
  await registerMetadataRoutes(app);
  await registerOAuthRoutes(app, config);
  await registerStkRoutes(app, stk);
  await registerC2BRoutes(app, c2b);
  await registerBusinessPaymentRoutes(app, payments);
  await registerSimulatorRoutes(app, transactions, callbacks);

  return { app, config };
}
