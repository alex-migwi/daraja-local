import type { CallbackDispatcherPort } from "../src/modules/callbacks/callback-dispatcher.js";
import type {
  CallbackAttempt,
  CallbackRole
} from "../src/modules/transactions/transaction.types.js";
import type { FastifyInstance } from "fastify";

export async function authHeaders(app: FastifyInstance) {
  const response = await app.inject({
    method: "GET",
    url: "/oauth/v1/generate?grant_type=client_credentials",
    headers: { authorization: `Basic ${Buffer.from("consumer_key:consumer_secret").toString("base64")}` }
  });
  const body = response.json();
  if (response.statusCode !== 200 || typeof body.access_token !== "string") {
    throw new Error(`OAuth test setup failed with status ${response.statusCode}`);
  }

  return { authorization: `Bearer ${body.access_token}` };
}

export function validStkRequest(overrides: Record<string, unknown> = {}) {
  return {
    BusinessShortCode: 174379,
    Password: "password",
    Timestamp: "20260603101010",
    TransactionType: "CustomerPayBillOnline",
    Amount: 100,
    PartyA: 254712345678,
    PartyB: 174379,
    PhoneNumber: 254712345678,
    CallBackURL: "http://127.0.0.1:65530/callback",
    AccountReference: "INV-001",
    TransactionDesc: "Test payment",
    ...overrides
  };
}

export class RecordingCallbackDispatcher implements CallbackDispatcherPort {
  readonly attempts: CallbackAttempt[] = [];

  async dispatch(url: string, payload: unknown, role: CallbackRole): Promise<CallbackAttempt> {
    const attempt: CallbackAttempt = {
      id: `callback-${this.attempts.length + 1}`,
      url,
      role,
      sentAt: new Date().toISOString(),
      statusCode: 200,
      ok: true,
      payload
    };
    this.attempts.push(attempt);
    return attempt;
  }
}
