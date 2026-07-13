import { afterEach, describe, expect, it } from "vitest";
import type { CallbackDispatcherPort } from "../src/modules/callbacks/callback-dispatcher.js";
import type {
  CallbackAttempt,
  CallbackRole
} from "../src/modules/transactions/transaction.types.js";
import { createServer } from "../src/server/create-server.js";
import { MemoryTransactionRepository } from "../src/storage/memory/memory-transaction.repository.js";
import { authHeaders } from "./helpers.js";

class C2BCallbackDispatcher implements CallbackDispatcherPort {
  readonly attempts: CallbackAttempt[] = [];

  constructor(private readonly validationAttempt: Partial<CallbackAttempt>) {}

  async dispatch(url: string, payload: unknown, role: CallbackRole): Promise<CallbackAttempt> {
    const isValidation = url.endsWith("/validation");
    const attempt: CallbackAttempt = {
      id: `callback-${this.attempts.length + 1}`,
      url,
      role,
      sentAt: new Date().toISOString(),
      statusCode: 200,
      ok: true,
      payload,
      ...(isValidation ? this.validationAttempt : {})
    };
    this.attempts.push(attempt);
    return attempt;
  }
}

describe("c2b validation lifecycle", () => {
  let server: Awaited<ReturnType<typeof createServer>>;
  let repository: MemoryTransactionRepository;

  afterEach(async () => {
    await server.app.close();
  });

  async function arrange(
    responseType: "Completed" | "Cancelled",
    validationAttempt: Partial<CallbackAttempt>,
    simulationOverrides: Record<string, unknown> = {}
  ) {
    const dispatcher = new C2BCallbackDispatcher(validationAttempt);
    repository = new MemoryTransactionRepository();
    server = await createServer({ dispatcher, repository });
    const headers = await authHeaders(server.app);

    const registration = await server.app.inject({
      method: "POST",
      url: "/mpesa/c2b/v1/registerurl",
      headers,
      payload: {
        ShortCode: "600000",
        ResponseType: responseType,
        ConfirmationURL: "http://callback.test/confirmation",
        ValidationURL: "http://callback.test/validation"
      }
    });
    expect(registration.statusCode).toBe(200);
    expect(registration.json()).toMatchObject({
      ConversationID: expect.any(String),
      OriginatorConversationID: expect.any(String),
      ResponseDescription: "success"
    });

    const simulation = await server.app.inject({
      method: "POST",
      url: "/mpesa/c2b/v1/simulate",
      headers,
      payload: {
        ShortCode: "600000",
        CommandID: "CustomerPayBillOnline",
        Amount: 250,
        Msisdn: "254712345678",
        BillRefNumber: "INV-250",
        ...simulationOverrides
      }
    });

    return { dispatcher, simulation };
  }

  async function onlyTransaction() {
    const transactions = await repository.list();
    expect(transactions).toHaveLength(1);
    return transactions[0]!;
  }

  it("validates, confirms, and completes an accepted payment", async () => {
    const { dispatcher, simulation } = await arrange("Cancelled", {
      responseBody: { ResultCode: 0, ResultDesc: "Accepted" }
    });

    expect(simulation.statusCode).toBe(200);
    expect(simulation.json().ConversationID).toMatch(/^C2B_/);
    expect(dispatcher.attempts.map(({ url, role }) => ({ url, role }))).toEqual([
      { url: "http://callback.test/validation", role: "C2B_VALIDATION" },
      { url: "http://callback.test/confirmation", role: "C2B_CONFIRMATION" }
    ]);
    expect(await onlyTransaction()).toMatchObject({
      status: "SUCCESS",
      callbackAttempts: [
        {
          url: "http://callback.test/validation",
          role: "C2B_VALIDATION",
          responseBody: { ResultCode: 0, ResultDesc: "Accepted" }
        },
        { url: "http://callback.test/confirmation", role: "C2B_CONFIRMATION" }
      ]
    });
  });

  it("fails an explicitly rejected payment without confirmation", async () => {
    const { dispatcher, simulation } = await arrange("Completed", {
      responseBody: { ResultCode: "C2B00012", ResultDesc: "Invalid account number" }
    });

    expect(simulation.statusCode).toBe(200);
    expect(dispatcher.attempts.map(({ url, role }) => ({ url, role }))).toEqual([
      { url: "http://callback.test/validation", role: "C2B_VALIDATION" }
    ]);
    expect(await onlyTransaction()).toMatchObject({
      status: "FAILED",
      resultCode: "C2B00012",
      resultDesc: "Invalid account number",
      callbackAttempts: [{}]
    });
  });

  it("uses Completed when validation cannot provide a decision", async () => {
    const { dispatcher, simulation } = await arrange("Completed", {
      ok: false,
      statusCode: 503,
      responseBody: "Unavailable"
    });

    expect(simulation.statusCode).toBe(200);
    expect(dispatcher.attempts).toHaveLength(2);
    expect(await onlyTransaction()).toMatchObject({ status: "SUCCESS", callbackAttempts: [{}, {}] });
  });

  it("uses Cancelled when validation cannot provide a decision", async () => {
    const { dispatcher, simulation } = await arrange("Cancelled", {
      ok: false,
      error: "Connection refused"
    });

    expect(simulation.statusCode).toBe(200);
    expect(dispatcher.attempts).toHaveLength(1);
    expect(await onlyTransaction()).toMatchObject({ status: "FAILED", callbackAttempts: [{}] });
  });

  it("rejects an unsupported simulation command", async () => {
    const dispatcher = new C2BCallbackDispatcher({});
    server = await createServer({ dispatcher });
    const headers = await authHeaders(server.app);
    await server.app.inject({
      method: "POST",
      url: "/mpesa/c2b/v1/registerurl",
      headers,
      payload: {
        ShortCode: "600000",
        ResponseType: "Completed",
        ConfirmationURL: "http://callback.test/confirmation",
        ValidationURL: "http://callback.test/validation"
      }
    });

    const simulation = await server.app.inject({
      method: "POST",
      url: "/mpesa/c2b/v1/simulate",
      headers,
      payload: {
        ShortCode: "600000",
        CommandID: "UnsupportedCommand",
        Amount: 250,
        Msisdn: "254712345678"
      }
    });

    expect(simulation.statusCode).toBe(400);
    expect(simulation.json().error.code).toBe("INVALID_C2B_SIMULATE_REQUEST");
    expect(dispatcher.attempts).toHaveLength(0);
  });

  it.each([
    ["string amount", { Amount: "250" }],
    ["boolean amount", { Amount: true }],
    ["fractional amount", { Amount: 2.5 }],
    ["invalid MSISDN", { Msisdn: "0712345678" }]
  ])("rejects a simulation with %s", async (_case, overrides) => {
    const { dispatcher, simulation } = await arrange("Completed", {}, overrides);

    expect(simulation.statusCode).toBe(400);
    expect(simulation.json().error.code).toBe("INVALID_C2B_SIMULATE_REQUEST");
    expect(dispatcher.attempts).toHaveLength(0);
  });
});
