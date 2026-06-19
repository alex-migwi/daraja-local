import { z } from "zod";

export const stkPushRequestSchema = z.object({
  BusinessShortCode: z.string().min(1),
  Password: z.string().min(1),
  Timestamp: z.string().min(1),
  TransactionType: z.string().min(1),
  Amount: z.coerce.number().positive(),
  PartyA: z.string().min(1),
  PartyB: z.string().min(1),
  PhoneNumber: z.string().min(1),
  CallBackURL: z.string().url(),
  AccountReference: z.string().min(1),
  TransactionDesc: z.string().min(1)
});

export const stkQueryRequestSchema = z.object({
  BusinessShortCode: z.string().min(1).optional(),
  Password: z.string().min(1).optional(),
  Timestamp: z.string().min(1).optional(),
  CheckoutRequestID: z.string().min(1)
});
