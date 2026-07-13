import {
  createBusinessPaymentResultPayload,
  createBusinessPaymentTimeoutPayload,
  createStkCallbackPayload
} from "./callback-payload.factory.js";
import { AppError } from "../../shared/errors.js";
import type { CallbackDispatcherPort } from "./callback-dispatcher.js";
import type { TransactionService } from "../transactions/transaction.service.js";
import type { Transaction } from "../transactions/transaction.types.js";
import type { StkTransaction } from "../transactions/transaction.types.js";

export class CallbackService {
  constructor(
    private readonly dispatcher: CallbackDispatcherPort,
    private readonly transactions: TransactionService
  ) {}

  async sendStkCallback(transaction: Transaction): Promise<Transaction> {
    assertStkTransaction(transaction);
    const payload = createStkCallbackPayload(transaction);
    if (!transaction.callbackUrl) {
      throw new AppError("CALLBACK_URL_MISSING", `Transaction ${transaction.trackingId} has no callback URL`, 400);
    }
    const attempt = await this.dispatcher.dispatch(transaction.callbackUrl, payload, "STK_RESULT");
    return this.transactions.addCallbackAttempt(transaction.trackingId, attempt);
  }

  async sendBusinessPaymentResult(transaction: Transaction): Promise<Transaction> {
    assertKind(transaction, ["B2C", "B2B", "B2C_ACCOUNT_TOPUP"]);
    const payload = createBusinessPaymentResultPayload(transaction);
    if (!transaction.resultUrl) {
      throw new AppError("RESULT_URL_MISSING", `Transaction ${transaction.trackingId} has no ResultURL`, 400);
    }
    const attempt = await this.dispatcher.dispatch(transaction.resultUrl, payload, "BUSINESS_RESULT");
    return this.transactions.addCallbackAttempt(transaction.trackingId, attempt);
  }

  async sendBusinessPaymentTimeout(transaction: Transaction): Promise<Transaction> {
    assertKind(transaction, ["B2C", "B2B", "B2C_ACCOUNT_TOPUP"]);
    const payload = createBusinessPaymentTimeoutPayload(transaction);
    if (!transaction.queueTimeoutUrl) {
      throw new AppError(
        "QUEUE_TIMEOUT_URL_MISSING",
        `Transaction ${transaction.trackingId} has no QueueTimeOutURL`,
        400
      );
    }
    const attempt = await this.dispatcher.dispatch(
      transaction.queueTimeoutUrl,
      payload,
      "BUSINESS_TIMEOUT"
    );
    return this.transactions.addCallbackAttempt(transaction.trackingId, attempt);
  }
}

function assertStkTransaction(transaction: Transaction): asserts transaction is StkTransaction {
  assertKind(transaction, ["STK"]);
  if (!transaction.merchantRequestId || !transaction.checkoutRequestId) {
    throw new AppError(
      "STK_IDENTIFIERS_MISSING",
      `Transaction ${transaction.trackingId} has no STK identifiers`,
      409
    );
  }
}

function assertKind(transaction: Transaction, expectedKinds: Transaction["kind"][]): void {
  if (!expectedKinds.includes(transaction.kind)) {
    throw new AppError(
      "INVALID_TRANSACTION_KIND",
      `Transaction ${transaction.trackingId} is ${transaction.kind}, expected ${expectedKinds.join(" or ")}`,
      409
    );
  }
}
