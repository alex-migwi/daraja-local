import { z } from "zod";
import { AppError } from "../../shared/errors.js";
import type { TransactionService } from "../transactions/transaction.service.js";
import type { TransactionKind } from "../transactions/transaction.types.js";

const b2cSchema = z.object({
  InitiatorName: z.string().min(1),
  SecurityCredential: z.string().min(1),
  CommandID: z.enum(["SalaryPayment", "BusinessPayment", "PromotionPayment"]),
  Amount: z.number().int().positive(),
  PartyA: z.string().min(1),
  PartyB: z.string().regex(/^254\d{9}$/, "PartyB must use the 254XXXXXXXXX format"),
  Remarks: z.string().min(1),
  QueueTimeOutURL: z.string().url(),
  ResultURL: z.string().url(),
  Occasion: z.string().optional()
}).strict();

function normalizeLegacyReceiverIdentifier(input: unknown) {
  if (typeof input !== "object" || input === null || !("RecieverIdentifierType" in input)) {
    return input;
  }

  const normalized = { ...input } as Record<string, unknown>;
  normalized.ReceiverIdentifierType ??= normalized.RecieverIdentifierType;
  delete normalized.RecieverIdentifierType;
  return normalized;
}

const b2bSchema = z.preprocess(
  normalizeLegacyReceiverIdentifier,
  z.object({
    Initiator: z.string().min(1),
    SecurityCredential: z.string().min(1),
    CommandID: z.enum([
      "BusinessPayBill",
      "BusinessBuyGoods",
      "DisburseFundsToBusiness",
      "BusinessToBusinessTransfer",
      "MerchantToMerchantTransfer"
    ]),
    SenderIdentifierType: z.union([z.string().min(1), z.number()]),
    ReceiverIdentifierType: z.union([z.string().min(1), z.number()]),
    Amount: z.number().int().positive(),
    PartyA: z.string().min(1),
    PartyB: z.string().min(1),
    AccountReference: z.string().min(1),
    Remarks: z.string().min(1),
    QueueTimeOutURL: z.string().url(),
    ResultURL: z.string().url()
  })
);

const accountTopUpSchema = z.object({
  InitiatorName: z.string().min(1),
  SecurityCredential: z.string().min(1),
  CommandID: z.string().min(1),
  Amount: z.number().int().positive(),
  PartyA: z.string().min(1),
  PartyB: z.string().min(1),
  Remarks: z.string().min(1),
  QueueTimeOutURL: z.string().url(),
  ResultURL: z.string().url(),
  Occasion: z.string().optional(),
  AccountReference: z.string().min(1).optional()
});

type AsyncPaymentInput = {
  amount: number;
  partyA: string;
  partyB: string;
  commandId: string;
  resultUrl: string;
  queueTimeoutUrl: string;
  accountReference?: string;
  phoneNumber?: string;
  rawRequest: unknown;
};

export class BusinessPaymentService {
  constructor(private readonly transactions: TransactionService) {}

  async b2c(input: unknown) {
    const parsed = b2cSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_B2C_REQUEST", parsed.error.issues[0]?.message ?? "Invalid B2C request", 400);
    }

    return this.createAcceptedPayment("B2C", {
      amount: parsed.data.Amount,
      partyA: parsed.data.PartyA,
      partyB: parsed.data.PartyB,
      phoneNumber: parsed.data.PartyB,
      commandId: parsed.data.CommandID,
      resultUrl: parsed.data.ResultURL,
      queueTimeoutUrl: parsed.data.QueueTimeOutURL,
      rawRequest: parsed.data
    });
  }

  async b2b(input: unknown) {
    const parsed = b2bSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_B2B_REQUEST", parsed.error.issues[0]?.message ?? "Invalid B2B request", 400);
    }

    return this.createAcceptedPayment("B2B", {
      amount: parsed.data.Amount,
      partyA: parsed.data.PartyA,
      partyB: parsed.data.PartyB,
      accountReference: parsed.data.AccountReference,
      commandId: parsed.data.CommandID,
      resultUrl: parsed.data.ResultURL,
      queueTimeoutUrl: parsed.data.QueueTimeOutURL,
      rawRequest: parsed.data
    });
  }

  async b2cAccountTopUp(input: unknown) {
    const parsed = accountTopUpSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_B2C_ACCOUNT_TOPUP_REQUEST", parsed.error.issues[0]?.message ?? "Invalid B2C account top-up request", 400);
    }

    return this.createAcceptedPayment("B2C_ACCOUNT_TOPUP", {
      amount: parsed.data.Amount,
      partyA: parsed.data.PartyA,
      partyB: parsed.data.PartyB,
      accountReference: parsed.data.AccountReference,
      commandId: parsed.data.CommandID,
      resultUrl: parsed.data.ResultURL,
      queueTimeoutUrl: parsed.data.QueueTimeOutURL,
      rawRequest: parsed.data
    });
  }

  private async createAcceptedPayment(kind: Exclude<TransactionKind, "STK" | "C2B">, input: AsyncPaymentInput) {
    const transaction = await this.transactions.createAsyncRequest({
      kind,
      amount: input.amount,
      senderParty: input.partyA,
      receiverParty: input.partyB,
      phoneNumber: input.phoneNumber,
      accountReference: input.accountReference,
      commandId: input.commandId,
      resultUrl: input.resultUrl,
      queueTimeoutUrl: input.queueTimeoutUrl,
      rawRequest: input.rawRequest
    });

    return {
      ConversationID: transaction.conversationId,
      OriginatorConversationID: transaction.originatorConversationId,
      ResponseCode: "0",
      ResponseDescription: "Accept the service request successfully."
    };
  }
}
