import { randomUUID } from "node:crypto";

export function createMerchantRequestId(): string {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export function createCheckoutRequestId(): string {
  return `ws_CO_${Date.now()}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function createConversationId(prefix = "AG"): string {
  return `${prefix}_${Date.now()}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function createTransactionReceipt(prefix = "DLOCAL"): string {
  return `${prefix}${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

export function createAccessToken(): string {
  return `daraja-local-token-${randomUUID()}`;
}
