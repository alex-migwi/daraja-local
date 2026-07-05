import { z } from "zod";

export const stkPushRequestSchema = z.object({
  BusinessShortCode: z.string().min(1),
  Password: z.string().min(1),
  // Enforce strict 14-digit numeric format (YYYYMMDDHHmmss)
  Timestamp: z.string().regex(/^\d{14}$/, "Timestamp must be 14 digits (YYYYMMDDHHmmss)"),
  TransactionType: z.enum(["CustomerPayBillOnline", "CustomerBuyGoodsOnline"]),
  Amount: z.coerce.number().positive(),
  // Enforce Kenyan phone format (254...)
  PartyA: z.string().regex(/^254\d{9}$/, "Phone number must start with 254 and be 12 digits"),
  PartyB: z.string().min(1),
  PhoneNumber: z.string().regex(/^254\d{9}$/, "Phone number must start with 254 and be 12 digits"),
  CallBackURL: z.string().url(),
  AccountReference: z.string().min(1),
  TransactionDesc: z.string().min(1)
});   

export const stkQueryRequestSchema = z.object({
  BusinessShortCode: z.string().min(1),
  Password: z.string().min(1),
  // Enforce 14-digit numeric timestamp (YYYYMMDDHHmmss)
  Timestamp: z.string().regex(/^\d{14}$/, "Timestamp must be 14 digits (YYYYMMDDHHmmss)"),
  CheckoutRequestID: z.string().min(1)
});   
