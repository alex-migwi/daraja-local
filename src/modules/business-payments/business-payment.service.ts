import { z } from "zod";
import { AppError } from "../../shared/errors.js";
import type { TransactionService } from "../transactions/transaction.service.js";
import type { TransactionKind } from "../transactions/transaction.types.js";

const baseAsyncPaymentSchema = z.object({
  InitiatorName: z.string().min(1),
  SecurityCredential: z.string().min(1),
  CommandID: z.string().min(1),
  Amount: z.coerce.number().positive(),
  PartyA: z.string().min(1),
  PartyB: z.string().min(1),
  Remarks: z.string().min(1),
  QueueTimeOutURL: z.string().url(),
  ResultURL: z.string().url(),
  Occassion: z.string().optional()
});

const b2cSchema = baseAsyncPaymentSchema.extend({
  PartyB: z.string().min(1)
});

const b2bSchema = baseAsyncPaymentSchema.extend({
  AccountReference: z.string().min(1).optional()
});

export class BusinessPaymentService {
  constructor(private readonly transactions: TransactionService) {}

  async b2c(input: unknown) {
    const parsed = b2cSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_B2C_REQUEST", parsed.error.issues[0]?.message ?? "Invalid B2C request", 400);
    }

    return this.createAcceptedPayment("B2C", parsed.data);
  }

  async b2b(input: unknown) {
    const parsed = b2bSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_B2B_REQUEST", parsed.error.issues[0]?.message ?? "Invalid B2B request", 400);
    }

    return this.createAcceptedPayment("B2B", parsed.data);
  }

  async b2cAccountTopUp(input: unknown) {
    const parsed = b2bSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_B2C_ACCOUNT_TOPUP_REQUEST", parsed.error.issues[0]?.message ?? "Invalid B2C account top-up request", 400);
    }

    return this.createAcceptedPayment("B2C_ACCOUNT_TOPUP", parsed.data);
  }

  private async createAcceptedPayment(kind: Exclude<TransactionKind, "STK" | "C2B">, payload: z.infer<typeof b2bSchema>) {
    const transaction = await this.transactions.createAsyncRequest({
      kind,
      amount: payload.Amount,
      senderParty: payload.PartyA,
      receiverParty: payload.PartyB,
      phoneNumber: kind === "B2C" ? payload.PartyB : undefined,
      accountReference: "AccountReference" in payload ? payload.AccountReference : undefined,
      commandId: payload.CommandID,
      resultUrl: payload.ResultURL,
      queueTimeoutUrl: payload.QueueTimeOutURL,
      rawRequest: payload
    });

    return {
      ConversationID: transaction.conversationId,
      OriginatorConversationID: transaction.originatorConversationId,
      ResponseCode: "0",
      ResponseDescription: "Accept the service request successfully."
    };
  }
}
