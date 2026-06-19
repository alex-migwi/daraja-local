import { z } from "zod";
import { AppError } from "../../shared/errors.js";
import type { CallbackDispatcher } from "../callbacks/callback-dispatcher.js";
import type { TransactionService } from "../transactions/transaction.service.js";

const registerUrlSchema = z.object({
  ShortCode: z.string().min(1),
  ResponseType: z.enum(["Completed", "Cancelled"]).default("Completed"),
  ConfirmationURL: z.string().url(),
  ValidationURL: z.string().url()
});

const simulateSchema = z.object({
  ShortCode: z.string().min(1),
  CommandID: z.string().min(1),
  Amount: z.coerce.number().positive(),
  Msisdn: z.string().min(1),
  BillRefNumber: z.string().min(1).optional()
});

export type C2BUrlRegistration = z.infer<typeof registerUrlSchema>;

export class C2BService {
  private readonly registrations = new Map<string, C2BUrlRegistration>();

  constructor(
    private readonly transactions: TransactionService,
    private readonly dispatcher: CallbackDispatcher
  ) {}

  async registerUrl(input: unknown) {
    const parsed = registerUrlSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_C2B_REGISTER_URL_REQUEST", parsed.error.issues[0]?.message ?? "Invalid C2B URL registration", 400);
    }

    this.registrations.set(parsed.data.ShortCode, parsed.data);

    return {
      OriginatorCoversationID: `daraja-local-c2b-${Date.now()}`,
      ResponseCode: "0",
      ResponseDescription: "success"
    };
  }

  async simulate(input: unknown) {
    const parsed = simulateSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_C2B_SIMULATE_REQUEST", parsed.error.issues[0]?.message ?? "Invalid C2B simulation", 400);
    }

    const registration = this.registrations.get(parsed.data.ShortCode);
    if (!registration) {
      throw new AppError("C2B_URLS_NOT_REGISTERED", `No C2B URLs registered for shortcode ${parsed.data.ShortCode}`, 404);
    }

    const transaction = await this.transactions.createAsyncRequest({
      kind: "C2B",
      amount: parsed.data.Amount,
      phoneNumber: parsed.data.Msisdn,
      accountReference: parsed.data.BillRefNumber,
      receiverParty: parsed.data.ShortCode,
      commandId: parsed.data.CommandID,
      resultUrl: registration.ConfirmationURL,
      rawRequest: parsed.data
    });

    const payload = {
      TransactionType: parsed.data.CommandID,
      TransID: transaction.conversationId,
      TransTime: new Date().toISOString().replace(/\D/g, "").slice(0, 14),
      TransAmount: String(parsed.data.Amount),
      BusinessShortCode: parsed.data.ShortCode,
      BillRefNumber: parsed.data.BillRefNumber ?? "",
      InvoiceNumber: "",
      OrgAccountBalance: "0.00",
      ThirdPartyTransID: "",
      MSISDN: parsed.data.Msisdn,
      FirstName: "Daraja",
      MiddleName: "Local",
      LastName: "Simulator"
    };

    const attempt = await this.dispatcher.dispatch(registration.ConfirmationURL, payload);
    await this.transactions.addCallbackAttempt(transaction.trackingId, attempt);

    return {
      ConversationID: transaction.conversationId,
      OriginatorCoversationID: transaction.originatorConversationId,
      ResponseCode: "0",
      ResponseDescription: "Accept the service request successfully."
    };
  }
}
