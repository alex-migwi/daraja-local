import { afterEach, describe, expect, it, vi } from "vitest";
import { CallbackDispatcher } from "../src/modules/callbacks/callback-dispatcher.js";

describe("CallbackDispatcher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    {
      name: "JSON",
      response: new Response('{"ResultCode":0,"ResultDesc":"Accepted"}', {
        status: 200,
        headers: { "content-type": "application/json" }
      }),
      expected: { ResultCode: 0, ResultDesc: "Accepted" }
    },
    {
      name: "text",
      response: new Response("accepted", { status: 202 }),
      expected: "accepted"
    },
    {
      name: "an empty body",
      response: new Response(null, { status: 204 }),
      expected: undefined
    }
  ])("captures $name without replacing the outbound payload", async ({ response, expected }) => {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    const payload = { TransID: "TEST-001" };

    const attempt = await new CallbackDispatcher(1_000).dispatch(
      "https://example.test/callback",
      payload,
      "STK_RESULT"
    );

    expect(attempt.payload).toBe(payload);
    expect(attempt).toMatchObject({
      url: "https://example.test/callback",
      role: "STK_RESULT"
    });
    expect(attempt.responseBody).toEqual(expected);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/callback",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: expect.any(AbortSignal)
      })
    );
  });

  it("records transport failures instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Connection refused")));

    const attempt = await new CallbackDispatcher(1_000).dispatch(
      "https://example.test/callback",
      { sent: true },
      "BUSINESS_RESULT"
    );

    expect(attempt).toMatchObject({
      url: "https://example.test/callback",
      role: "BUSINESS_RESULT",
      ok: false,
      error: "Connection refused"
    });
  });

  it("records non-success HTTP responses and their body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"error":"unavailable"}', {
          status: 503,
          headers: { "content-type": "application/json" }
        })
      )
    );

    const attempt = await new CallbackDispatcher(1_000).dispatch(
      "https://example.test/callback",
      { sent: true },
      "C2B_VALIDATION"
    );

    expect(attempt).toMatchObject({
      statusCode: 503,
      ok: false,
      responseBody: { error: "unavailable" }
    });
  });
});
