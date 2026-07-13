import type {
  CallbackAttempt,
  Transaction,
  TransactionRepository,
  TransactionStatus
} from "../../modules/transactions/transaction.types.js";

export class MemoryTransactionRepository implements TransactionRepository {
  private readonly transactions = new Map<string, Transaction>();

  async create(transaction: Transaction): Promise<Transaction> {
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async transition(
    trackingId: string,
    expectedStatus: TransactionStatus,
    changes: Pick<Transaction, "status" | "resultCode" | "resultDesc" | "updatedAt">
  ): Promise<Transaction | undefined> {
    const transaction = this.findStoredByTrackingId(trackingId);
    if (!transaction || transaction.status !== expectedStatus) {
      return undefined;
    }

    const updated = { ...transaction, ...changes };
    this.transactions.set(updated.id, updated);
    return updated;
  }

  async appendCallbackAttempt(
    trackingId: string,
    attempt: CallbackAttempt,
    updatedAt: string
  ): Promise<Transaction | undefined> {
    const transaction = this.findStoredByTrackingId(trackingId);
    if (!transaction) {
      return undefined;
    }

    const updated = {
      ...transaction,
      callbackAttempts: [...transaction.callbackAttempts, attempt],
      updatedAt
    };
    this.transactions.set(updated.id, updated);
    return updated;
  }

  async findById(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async findByCheckoutRequestId(checkoutRequestId: string): Promise<Transaction | undefined> {
    return [...this.transactions.values()].find((transaction) => transaction.checkoutRequestId === checkoutRequestId);
  }

  async findByTrackingId(trackingId: string): Promise<Transaction | undefined> {
    return this.findStoredByTrackingId(trackingId);
  }

  async list(): Promise<Transaction[]> {
    return [...this.transactions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private findStoredByTrackingId(trackingId: string): Transaction | undefined {
    return [...this.transactions.values()].find((transaction) => transaction.trackingId === trackingId);
  }
}
