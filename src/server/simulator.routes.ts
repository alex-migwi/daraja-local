import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { CallbackService } from "../modules/callbacks/callback.service.js";
import type { TransactionService } from "../modules/transactions/transaction.service.js";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function registerSimulatorRoutes(
  app: FastifyInstance,
  transactions: TransactionService,
  callbacks: CallbackService
) {
  app.get("/simulator/transactions", async () => transactions.list());

  app.get("/simulator/transactions/:id", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    return transactions.getByTrackingId(id);
  });

  app.post("/simulator/stk/:id/approve", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const transaction = await transactions.transition(id, "SUCCESS");
    return callbacks.sendStkCallback(transaction);
  });

  app.post("/simulator/stk/:id/fail", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const transaction = await transactions.transition(id, "FAILED");
    return callbacks.sendStkCallback(transaction);
  });

  app.post("/simulator/stk/:id/timeout", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const transaction = await transactions.transition(id, "TIMEOUT");
    return callbacks.sendStkCallback(transaction);
  });

  app.post("/simulator/stk/:id/replay-callback", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const transaction = await transactions.getByTrackingId(id);
    return callbacks.sendStkCallback(transaction);
  });

  for (const action of ["approve", "fail", "timeout"] as const) {
    app.post(`/simulator/payments/:id/${action}`, async (request) => {
      const { id } = paramsSchema.parse(request.params);
      const status = action === "approve" ? "SUCCESS" : action === "fail" ? "FAILED" : "TIMEOUT";
      const transaction = await transactions.transition(id, status);
      return callbacks.sendBusinessPaymentResult(transaction);
    });
  }

  app.post("/simulator/payments/:id/replay-callback", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const transaction = await transactions.getByTrackingId(id);
    return callbacks.sendBusinessPaymentResult(transaction);
  });
}
