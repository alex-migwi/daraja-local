import { AppError } from "../../shared/errors.js";
import type { TransactionService } from "../transactions/transaction.service.js";
import type { Transaction } from "../transactions/transaction.types.js";
import { stkPushRequestSchema, stkQueryRequestSchema } from "./stk.schema.js";

export class StkService {
  constructor(private readonly transactions: TransactionService) {}

  async push(input: unknown) {
    const parsed = stkPushRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_STK_REQUEST", parsed.error.issues[0]?.message ?? "Invalid STK request", 400);
    }

    const transaction = await this.transactions.createFromStkRequest(parsed.data);
    return {
      MerchantRequestID: transaction.merchantRequestId,
      CheckoutRequestID: transaction.checkoutRequestId,
      ResponseCode: "0",
      ResponseDescription: "Success. Request accepted for processing",
      CustomerMessage: "Success. Request accepted for processing"
    };
  }

  async query(input: unknown) {
    const parsed = stkQueryRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_STK_QUERY", parsed.error.issues[0]?.message ?? "Invalid STK query", 400);
    }

    const transaction = await this.transactions.getByCheckoutRequestId(parsed.data.CheckoutRequestID);
    return mapTransactionToQueryResponse(transaction);
  }
}

function mapTransactionToQueryResponse(transaction: Transaction) {
  if (transaction.status === "PENDING") {
    return {
      ResponseCode: "0",
      ResponseDescription: "The service request has been accepted successfully",
      MerchantRequestID: transaction.merchantRequestId,
      CheckoutRequestID: transaction.checkoutRequestId,
      ResultCode: "9999",
      ResultDesc: "The transaction is being processed"
    };
  }

  return {
    ResponseCode: "0",
    ResponseDescription: "The service request has been accepted successfully",
    MerchantRequestID: transaction.merchantRequestId,
    CheckoutRequestID: transaction.checkoutRequestId,
    ResultCode: String(transaction.resultCode),
    ResultDesc: transaction.resultDesc
  };
}
