import type { Transaction, TransactionRepository } from "../../modules/transactions/transaction.types.js";

export class MemoryTransactionRepository implements TransactionRepository {
  private readonly transactions = new Map<string, Transaction>();

  async create(transaction: Transaction): Promise<Transaction> {
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async update(transaction: Transaction): Promise<Transaction> {
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async findById(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async findByCheckoutRequestId(checkoutRequestId: string): Promise<Transaction | undefined> {
    return [...this.transactions.values()].find((transaction) => transaction.checkoutRequestId === checkoutRequestId);
  }

  async findByTrackingId(trackingId: string): Promise<Transaction | undefined> {
    return [...this.transactions.values()].find((transaction) => transaction.trackingId === trackingId);
  }

  async list(): Promise<Transaction[]> {
    return [...this.transactions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
