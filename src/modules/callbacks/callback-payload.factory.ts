import type { StkTransaction, Transaction } from "../transactions/transaction.types.js";
import { createTransactionReceipt } from "../../shared/id.js";

export function createStkCallbackPayload(transaction: StkTransaction) {
  const base = {
    Body: {
      stkCallback: {
        MerchantRequestID: transaction.merchantRequestId,
        CheckoutRequestID: transaction.checkoutRequestId,
        ResultCode: transaction.resultCode ?? 9999,
        ResultDesc: transaction.resultDesc ?? "The transaction is being processed"
      }
    }
  };

  if (transaction.status !== "SUCCESS") {
    return base;
  }

  return {
    Body: {
      stkCallback: {
        ...base.Body.stkCallback,
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: transaction.amount },
            { Name: "MpesaReceiptNumber", Value: `DLOCAL${transaction.checkoutRequestId.slice(-8)}` },
            { Name: "TransactionDate", Value: Number(new Date().toISOString().replace(/\D/g, "").slice(0, 14)) },
            { Name: "PhoneNumber", Value: Number(transaction.phoneNumber ?? 0) }
          ]
        }
      }
    }
  };
}

export function createBusinessPaymentResultPayload(transaction: Transaction) {
  const transactionReceipt = transaction.status === "SUCCESS" ? createTransactionReceipt() : "";
  const b2cAccountBalances = transaction.kind === "B2C"
    ? [
        { Key: "B2CWorkingAccountAvailableFunds", Value: "0.00" },
        { Key: "B2CUtilityAccountAvailableFunds", Value: "0.00" }
      ]
    : [];
  const resultParameters = [
    { Key: "TransactionAmount", Value: transaction.amount },
    { Key: "TransactionReceipt", Value: transactionReceipt },
    { Key: "ReceiverPartyPublicName", Value: transaction.receiverParty ?? transaction.phoneNumber ?? "" },
    ...b2cAccountBalances,
    { Key: "TransactionCompletedDateTime", Value: new Date().toISOString() }
  ];

  return {
    Result: {
      ResultType: 0,
      ResultCode: transaction.resultCode ?? 9999,
      ResultDesc: transaction.resultDesc ?? "The transaction is being processed",
      OriginatorConversationID: transaction.originatorConversationId,
      ConversationID: transaction.conversationId,
      TransactionID: transactionReceipt,
      ResultParameters: {
        ResultParameter: resultParameters
      },
      ReferenceData: {
        ReferenceItem: {
          Key: "QueueTimeoutURL",
          Value: transaction.queueTimeoutUrl ?? ""
        }
      }
    }
  };
}

export function createBusinessPaymentTimeoutPayload(transaction: Transaction) {
  return {
    Result: {
      ResultType: 0,
      ResultCode: transaction.resultCode ?? 9999,
      ResultDesc: transaction.resultDesc ?? "The transaction timed out",
      OriginatorConversationID: transaction.originatorConversationId,
      ConversationID: transaction.conversationId,
      TransactionID: ""
    }
  };
}
