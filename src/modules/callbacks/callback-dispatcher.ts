import { randomUUID } from "node:crypto";
import type { CallbackAttempt } from "../transactions/transaction.types.js";

export class CallbackDispatcher {
  constructor(private readonly timeoutMs: number) {}

  async dispatch(url: string, payload: unknown): Promise<CallbackAttempt> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      return {
        id: randomUUID(),
        sentAt: new Date().toISOString(),
        ok: response.ok,
        statusCode: response.status,
        payload
      };
    } catch (error) {
      return {
        id: randomUUID(),
        sentAt: new Date().toISOString(),
        ok: false,
        error: error instanceof Error ? error.message : "Callback dispatch failed",
        payload
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
