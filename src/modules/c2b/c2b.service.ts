import { z } from "zod";
import { AppError } from "../../shared/errors.js";
import { createConversationId } from "../../shared/id.js";
import type { CallbackDispatcherPort } from "../callbacks/callback-dispatcher.js";
import type { TransactionService } from "../transactions/transaction.service.js";
import type { CallbackAttempt } from "../transactions/transaction.types.js";

const registerUrlSchema = z.object({
  ShortCode: z.string().min(1),
  ResponseType: z.enum(["Completed", "Cancelled"]),
  ConfirmationURL: z.string().url(),
  ValidationURL: z.string().url()
});

const simulateSchema = z.object({
  ShortCode: z.string().min(1),
  CommandID: z.literal("CustomerPayBillOnline"),
  Amount: z.number().int().positive(),
  Msisdn: z.string().regex(/^254\d{9}$/, "Msisdn must use the 254XXXXXXXXX format"),
  BillRefNumber: z.string().min(1).optional()
});

const validationDecisionSchema = z.object({
  ResultCode: z.union([z.string(), z.number()]).transform(String),
  ResultDesc: z.string()
});

export type C2BUrlRegistration = z.infer<typeof registerUrlSchema>;

export class C2BService {
  private readonly registrations = new Map<string, C2BUrlRegistration>();

  constructor(
    private readonly transactions: TransactionService,
    private readonly dispatcher: CallbackDispatcherPort
  ) {}

  async registerUrl(input: unknown) {
    const parsed = registerUrlSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("INVALID_C2B_REGISTER_URL_REQUEST", parsed.error.issues[0]?.message ?? "Invalid C2B URL registration", 400);
    }

    this.registrations.set(parsed.data.ShortCode, parsed.data);

    return {
      ConversationID: createConversationId("C2B_REGISTER"),
      OriginatorConversationID: createConversationId("ORIGINATOR"),
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

    const validationAttempt = await this.dispatcher.dispatch(
      registration.ValidationURL,
      payload,
      "C2B_VALIDATION"
    );
    await this.transactions.addCallbackAttempt(transaction.trackingId, validationAttempt);

    const validationFailure = getValidationFailure(validationAttempt, registration.ResponseType);
    if (validationFailure) {
      await this.transactions.transitionC2B(transaction.trackingId, "FAILED", {
        code: validationFailure.code,
        desc: validationFailure.description
      });
      return simulationAcknowledgement(transaction);
    }

    const confirmationAttempt = await this.dispatcher.dispatch(
      registration.ConfirmationURL,
      payload,
      "C2B_CONFIRMATION"
    );
    await this.transactions.addCallbackAttempt(transaction.trackingId, confirmationAttempt);
    await this.transactions.transitionC2B(transaction.trackingId, "SUCCESS");

    return simulationAcknowledgement(transaction);
  }
}

function simulationAcknowledgement(transaction: {
  conversationId?: string;
  originatorConversationId?: string;
}) {
  return {
    ConversationID: transaction.conversationId,
    OriginatorConversationID: transaction.originatorConversationId,
    ResponseDescription: "Accept the service request successfully."
  };
}

function getValidationFailure(
  attempt: CallbackAttempt,
  responseType: C2BUrlRegistration["ResponseType"]
): { code: string | number; description: string } | undefined {
  const decision = attempt.ok
    ? validationDecisionSchema.safeParse(attempt.responseBody)
    : undefined;

  if (decision?.success && decision.data.ResultCode !== "0") {
    return {
      code: decision.data.ResultCode,
      description: decision.data.ResultDesc
    };
  }

  if (!decision?.success && responseType === "Cancelled") {
    return {
      code: 1,
      description: "C2B validation did not return a valid decision."
    };
  }

  return undefined;
}
