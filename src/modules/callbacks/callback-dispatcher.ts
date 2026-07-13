import { randomUUID } from "node:crypto";
import type { CallbackAttempt, CallbackRole } from "../transactions/transaction.types.js";

export type CallbackDispatcherPort = {
  dispatch(url: string, payload: unknown, role: CallbackRole): Promise<CallbackAttempt>;
};

export class CallbackDispatcher implements CallbackDispatcherPort {
  constructor(private readonly timeoutMs: number) {}

  async dispatch(url: string, payload: unknown, role: CallbackRole): Promise<CallbackAttempt> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const responseBody = await readResponseBody(response);

      return {
        id: randomUUID(),
        url,
        role,
        sentAt: new Date().toISOString(),
        ok: response.ok,
        statusCode: response.status,
        payload,
        responseBody
      };
    } catch (error) {
      return {
        id: randomUUID(),
        url,
        role,
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

async function readResponseBody(response: Response): Promise<unknown> {
  const body = await response.text();
  if (body.length === 0) return undefined;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}
