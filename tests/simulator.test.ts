import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server/create-server.js";
import { authHeaders, RecordingCallbackDispatcher, validStkRequest } from "./helpers.js";

describe("simulator endpoints", () => {
  let server: Awaited<ReturnType<typeof createServer>>;
  let dispatcher: RecordingCallbackDispatcher;
  let headers: Awaited<ReturnType<typeof authHeaders>>;

  beforeEach(async () => {
    dispatcher = new RecordingCallbackDispatcher();
    server = await createServer({ dispatcher });
    headers = await authHeaders(server.app);
  });

  afterEach(async () => {
    await server.app.close();
  });

  it("approves a transaction and sends a success callback", async () => {
    const callbackUrl = "http://callback.test/stk";
    const push = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      headers,
      payload: validStkRequest({ CallBackURL: callbackUrl })
    });
    const checkoutRequestId = push.json().CheckoutRequestID;

    const approve = await server.app.inject({
      method: "POST",
      url: `/simulator/stk/${checkoutRequestId}/approve`
    });

    expect(approve.statusCode).toBe(200);
    expect(approve.json().status).toBe("SUCCESS");
    expect(approve.json().callbackAttempts).toHaveLength(1);
    expect(dispatcher.attempts).toHaveLength(1);
    expect(dispatcher.attempts[0]?.payload).toMatchObject({
      Body: {
        stkCallback: {
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 0
        }
      }
    });
  });

  it("rejects invalid state transitions", async () => {
    const push = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      headers,
      payload: validStkRequest()
    });
    const checkoutRequestId = push.json().CheckoutRequestID;

    await server.app.inject({ method: "POST", url: `/simulator/stk/${checkoutRequestId}/fail` });
    const approve = await server.app.inject({ method: "POST", url: `/simulator/stk/${checkoutRequestId}/approve` });

    expect(approve.statusCode).toBe(409);
    expect(approve.json().error.code).toBe("INVALID_TRANSACTION_TRANSITION");
  });

  it("does not transition an STK transaction through a payment route", async () => {
    const push = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      headers,
      payload: validStkRequest()
    });
    const checkoutRequestId = push.json().CheckoutRequestID;

    const response = await server.app.inject({
      method: "POST",
      url: `/simulator/payments/${checkoutRequestId}/approve`
    });
    const transaction = await server.app.inject({
      method: "GET",
      url: `/simulator/transactions/${checkoutRequestId}`
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("INVALID_TRANSACTION_KIND");
    expect(transaction.json().status).toBe("PENDING");
  });

  it("rejects replay through the wrong callback family", async () => {
    const push = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      headers,
      payload: validStkRequest()
    });
    const checkoutRequestId = push.json().CheckoutRequestID;

    const response = await server.app.inject({
      method: "POST",
      url: `/simulator/payments/${checkoutRequestId}/replay-callback`
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("INVALID_TRANSACTION_KIND");
    expect(dispatcher.attempts).toHaveLength(0);
  });
});
