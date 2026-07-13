import { randomUUID } from "node:crypto";
import { createCheckoutRequestId, createConversationId, createMerchantRequestId } from "../../shared/id.js";
import { AppError } from "../../shared/errors.js";
import { assertCanTransition } from "./transaction-state-machine.js";
import type {
  CallbackAttempt,
  StkRequestPayload,
  StkTransaction,
  Transaction,
  TransactionKind,
  TransactionRepository,
  TransactionStatus
} from "./transaction.types.js";

const resultDetails: Record<Exclude<TransactionStatus, "PENDING">, { code: number; desc: string }> = {
  SUCCESS: { code: 0, desc: "The service request is processed successfully." },
  FAILED: { code: 1, desc: "The balance is insufficient for the transaction." },
  TIMEOUT: { code: 1, desc: "The transaction timed out." }
};

export class TransactionService {
  constructor(private readonly repository: TransactionRepository) {}

  async createFromStkRequest(payload: StkRequestPayload): Promise<StkTransaction> {
    const now = new Date().toISOString();
    const checkoutRequestId = createCheckoutRequestId();
    const transaction: StkTransaction = {
      id: randomUUID(),
      kind: "STK",
      trackingId: checkoutRequestId,
      merchantRequestId: createMerchantRequestId(),
      checkoutRequestId,
      status: "PENDING",
      amount: payload.Amount,
      phoneNumber: String(payload.PhoneNumber),
      accountReference: payload.AccountReference,
      callbackUrl: payload.CallBackURL,
      rawRequest: payload,
      createdAt: now,
      updatedAt: now,
      callbackAttempts: []
    };

    await this.repository.create(transaction);
    return transaction;
  }

  async createAsyncRequest(input: {
    kind: Exclude<TransactionKind, "STK">;
    amount: number;
    rawRequest: unknown;
    resultUrl?: string;
    queueTimeoutUrl?: string;
    originatorConversationId?: string;
    phoneNumber?: string;
    accountReference?: string;
    senderParty?: string;
    receiverParty?: string;
    commandId?: string;
  }): Promise<Transaction> {
    const now = new Date().toISOString();
    const conversationId = createConversationId(input.kind);
    const originatorConversationId = input.originatorConversationId ?? createConversationId("ORIGINATOR");
    const transaction: Transaction = {
      id: randomUUID(),
      kind: input.kind,
      trackingId: conversationId,
      conversationId,
      originatorConversationId,
      status: "PENDING",
      amount: input.amount,
      phoneNumber: input.phoneNumber,
      accountReference: input.accountReference,
      senderParty: input.senderParty,
      receiverParty: input.receiverParty,
      commandId: input.commandId,
      resultUrl: input.resultUrl,
      queueTimeoutUrl: input.queueTimeoutUrl,
      rawRequest: input.rawRequest,
      createdAt: now,
      updatedAt: now,
      callbackAttempts: []
    };

    return this.repository.create(transaction);
  }

  async getByCheckoutRequestId(checkoutRequestId: string): Promise<StkTransaction> {
    const transaction = await this.repository.findByCheckoutRequestId(checkoutRequestId);
    if (!isStkTransaction(transaction)) {
      throw new AppError("TRANSACTION_NOT_FOUND", `Transaction ${checkoutRequestId} was not found`, 404);
    }
    return transaction;
  }

  async getByTrackingId(trackingId: string): Promise<Transaction> {
    const transaction = await this.repository.findByTrackingId(trackingId);
    if (!transaction) {
      throw new AppError("TRANSACTION_NOT_FOUND", `Transaction ${trackingId} was not found`, 404);
    }
    return transaction;
  }

  list(): Promise<Transaction[]> {
    return this.repository.list();
  }

  transitionStk(trackingId: string, status: Exclude<TransactionStatus, "PENDING">): Promise<Transaction> {
    return this.transition(trackingId, status, ["STK"]);
  }

  transitionBusinessPayment(
    trackingId: string,
    status: Exclude<TransactionStatus, "PENDING">
  ): Promise<Transaction> {
    return this.transition(trackingId, status, ["B2C", "B2B", "B2C_ACCOUNT_TOPUP"]);
  }

  transitionC2B(
    trackingId: string,
    status: "SUCCESS" | "FAILED",
    result?: { code: number | string; desc: string }
  ): Promise<Transaction> {
    return this.transition(trackingId, status, ["C2B"], result);
  }

  private async transition(
    trackingId: string,
    status: Exclude<TransactionStatus, "PENDING">,
    expectedKinds: TransactionKind[],
    result?: { code: number | string; desc: string }
  ): Promise<Transaction> {
    const transaction = await this.getByTrackingId(trackingId);
    if (!expectedKinds.includes(transaction.kind)) {
      throw new AppError(
        "INVALID_TRANSACTION_KIND",
        `Transaction ${trackingId} is ${transaction.kind}, expected ${expectedKinds.join(" or ")}`,
        409
      );
    }
    assertCanTransition(transaction.status, status);

    const details = result ?? resultDetails[status];
    const updated = await this.repository.transition(trackingId, transaction.status, {
      status,
      resultCode: details.code,
      resultDesc: details.desc,
      updatedAt: new Date().toISOString()
    });
    if (updated) {
      return updated;
    }

    const current = await this.getByTrackingId(trackingId);
    assertCanTransition(current.status, status);
    throw new AppError("TRANSACTION_UPDATE_CONFLICT", `Transaction ${trackingId} changed concurrently`, 409);
  }

  async addCallbackAttempt(trackingId: string, attempt: CallbackAttempt): Promise<Transaction> {
    const updated = await this.repository.appendCallbackAttempt(trackingId, attempt, new Date().toISOString());
    if (!updated) {
      throw new AppError("TRANSACTION_NOT_FOUND", `Transaction ${trackingId} was not found`, 404);
    }
    return updated;
  }
}

function isStkTransaction(transaction: Transaction | undefined): transaction is StkTransaction {
  return Boolean(
    transaction?.kind === "STK" &&
    transaction.merchantRequestId &&
    transaction.checkoutRequestId
  );
}
