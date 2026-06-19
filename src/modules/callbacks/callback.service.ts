import { createBusinessPaymentResultPayload, createStkCallbackPayload } from "./callback-payload.factory.js";
import { AppError } from "../../shared/errors.js";
import type { CallbackDispatcher } from "./callback-dispatcher.js";
import type { TransactionService } from "../transactions/transaction.service.js";
import type { Transaction } from "../transactions/transaction.types.js";

export class CallbackService {
  constructor(
    private readonly dispatcher: CallbackDispatcher,
    private readonly transactions: TransactionService
  ) {}

  async sendStkCallback(transaction: Transaction): Promise<Transaction> {
    const payload = createStkCallbackPayload(transaction);
    if (!transaction.callbackUrl) {
      throw new AppError("CALLBACK_URL_MISSING", `Transaction ${transaction.trackingId} has no callback URL`, 400);
    }
    const attempt = await this.dispatcher.dispatch(transaction.callbackUrl, payload);
    return this.transactions.addCallbackAttempt(transaction.trackingId, attempt);
  }

  async sendBusinessPaymentResult(transaction: Transaction): Promise<Transaction> {
    const payload = createBusinessPaymentResultPayload(transaction);
    if (!transaction.resultUrl) {
      throw new AppError("RESULT_URL_MISSING", `Transaction ${transaction.trackingId} has no ResultURL`, 400);
    }
    const attempt = await this.dispatcher.dispatch(transaction.resultUrl, payload);
    return this.transactions.addCallbackAttempt(transaction.trackingId, attempt);
  }
}
