import { randomUUID } from "node:crypto";
import { createCheckoutRequestId, createConversationId, createMerchantRequestId } from "../../shared/id.js";
import { AppError } from "../../shared/errors.js";
import { assertCanTransition } from "./transaction-state-machine.js";
import type {
  CallbackAttempt,
  StkRequestPayload,
  Transaction,
  TransactionKind,
  TransactionRepository,
  TransactionStatus
} from "./transaction.types.js";

const resultDetails: Record<Exclude<TransactionStatus, "PENDING">, { code: number; desc: string }> = {
  SUCCESS: { code: 0, desc: "The service request is processed successfully." },
  FAILED: { code: 1, desc: "The balance is insufficient for the transaction." },
  TIMEOUT: { code: 1032, desc: "Request cancelled by user." }
};

export class TransactionService {
  constructor(private readonly repository: TransactionRepository) {}

  async createFromStkRequest(payload: StkRequestPayload): Promise<Transaction> {
    const now = new Date().toISOString();
    const checkoutRequestId = createCheckoutRequestId();
    const transaction: Transaction = {
      id: randomUUID(),
      kind: "STK",
      trackingId: checkoutRequestId,
      merchantRequestId: createMerchantRequestId(),
      checkoutRequestId,
      status: "PENDING",
      amount: payload.Amount,
      phoneNumber: payload.PhoneNumber,
      accountReference: payload.AccountReference,
      callbackUrl: payload.CallBackURL,
      rawRequest: payload,
      createdAt: now,
      updatedAt: now,
      callbackAttempts: []
    };

    return this.repository.create(transaction);
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
      merchantRequestId: createMerchantRequestId(),
      checkoutRequestId: conversationId,
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

  async getByCheckoutRequestId(checkoutRequestId: string): Promise<Transaction> {
    const transaction = await this.repository.findByCheckoutRequestId(checkoutRequestId);
    if (!transaction) {
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

  async transition(checkoutRequestId: string, status: Exclude<TransactionStatus, "PENDING">): Promise<Transaction> {
    const transaction = await this.getByTrackingId(checkoutRequestId);
    assertCanTransition(transaction.status, status);

    const details = resultDetails[status];
    return this.repository.update({
      ...transaction,
      status,
      resultCode: details.code,
      resultDesc: details.desc,
      updatedAt: new Date().toISOString()
    });
  }

  async addCallbackAttempt(checkoutRequestId: string, attempt: CallbackAttempt): Promise<Transaction> {
    const transaction = await this.getByTrackingId(checkoutRequestId);
    return this.repository.update({
      ...transaction,
      callbackAttempts: [...transaction.callbackAttempts, attempt],
      updatedAt: new Date().toISOString()
    });
  }
}
