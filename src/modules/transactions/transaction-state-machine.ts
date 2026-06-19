import { AppError } from "../../shared/errors.js";
import type { TransactionStatus } from "./transaction.types.js";

const allowedTransitions: Record<TransactionStatus, TransactionStatus[]> = {
  PENDING: ["SUCCESS", "FAILED", "TIMEOUT"],
  SUCCESS: [],
  FAILED: [],
  TIMEOUT: []
};

export function assertCanTransition(from: TransactionStatus, to: TransactionStatus): void {
  if (!allowedTransitions[from].includes(to)) {
    throw new AppError("INVALID_TRANSACTION_TRANSITION", `Cannot transition transaction from ${from} to ${to}`, 409);
  }
}
