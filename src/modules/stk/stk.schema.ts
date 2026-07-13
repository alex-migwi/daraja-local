import { z } from "zod";

const kenyanMsisdnSchema = z.number().int().min(254000000000).max(254999999999);

export const stkPushRequestSchema = z.object({
  BusinessShortCode: z.number().int().positive(),
  Password: z.string().min(1),
  Timestamp: z.string().regex(/^\d{14}$/, "Timestamp must be 14 digits (YYYYMMDDHHmmss)"),
  TransactionType: z.enum(["CustomerPayBillOnline", "CustomerBuyGoodsOnline"]),
  Amount: z.number().int().positive(),
  PartyA: kenyanMsisdnSchema,
  PartyB: z.number().int().positive(),
  PhoneNumber: kenyanMsisdnSchema,
  CallBackURL: z.string().url(),
  AccountReference: z.string().min(1),
  TransactionDesc: z.string().min(1)
});

export const stkQueryRequestSchema = z.object({
  BusinessShortCode: z.number().int().positive(),
  Password: z.string().min(1),
  Timestamp: z.string().regex(/^\d{14}$/, "Timestamp must be 14 digits (YYYYMMDDHHmmss)"),
  CheckoutRequestID: z.string().min(1)
});
