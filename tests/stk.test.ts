import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server/create-server.js";
import { authHeaders, validStkRequest } from "./helpers.js";

describe("stk endpoints", () => {
  let server: Awaited<ReturnType<typeof createServer>>;
  let headers: Awaited<ReturnType<typeof authHeaders>>;

  beforeEach(async () => {
    server = await createServer();
    headers = await authHeaders(server.app);
  });

  afterEach(async () => {
    await server.app.close();
  });

  it("creates a pending transaction for a valid STK push", async () => {
    const push = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      headers,
      payload: validStkRequest()
    });

    expect(push.statusCode).toBe(200);
    const body = push.json();
    expect(body.ResponseCode).toBe("0");
    expect(body.CheckoutRequestID).toMatch(/^ws_CO_/);

    const query = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpushquery/v1/query",
      headers,
      payload: {
        BusinessShortCode: 174379,
        Password: "password",
        Timestamp: "20260603101010",
        CheckoutRequestID: body.CheckoutRequestID
      }
    });

    expect(query.statusCode).toBe(200);
    expect(query.json()).toMatchObject({
      CheckoutRequestID: body.CheckoutRequestID,
      ResultCode: "9999"
    });
  });

  it.each([
    ["negative", -1],
    ["fractional", 1.5],
    ["string", "100"],
    ["boolean", true]
  ])("rejects a %s STK amount", async (_case, Amount) => {
    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      headers,
      payload: validStkRequest({ Amount })
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_STK_REQUEST");
  });

  it.each(["BusinessShortCode", "PartyA", "PartyB", "PhoneNumber"])(
    "rejects a string %s",
    async (field) => {
      const request = validStkRequest();
      const key = field as keyof typeof request;
      const response = await server.app.inject({
        method: "POST",
        url: "/mpesa/stkpush/v1/processrequest",
        headers,
        payload: { ...request, [key]: String(request[key]) }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("INVALID_STK_REQUEST");
    }
  );

  it("returns not found for unknown checkout request IDs", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpushquery/v1/query",
      headers,
      payload: {
        BusinessShortCode: 174379,
        Password: "password",
        Timestamp: "20260603101010",
        CheckoutRequestID: "missing"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("TRANSACTION_NOT_FOUND");
  });

  it("does not return a business payment through STK query", async () => {
    const payment = await server.app.inject({
      method: "POST",
      url: "/mpesa/b2c/v1/paymentrequest",
      headers,
      payload: {
        InitiatorName: "testapi",
        SecurityCredential: "credential",
        CommandID: "BusinessPayment",
        Amount: 1000,
        PartyA: "600000",
        PartyB: "254712345678",
        Remarks: "Local payout",
        QueueTimeOutURL: "http://callback.test/timeout",
        ResultURL: "http://callback.test/result",
        Occasion: "Test"
      }
    });

    expect(payment.statusCode).toBe(200);

    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpushquery/v1/query",
      headers,
      payload: {
        BusinessShortCode: 174379,
        Password: "password",
        Timestamp: "20260603101010",
        CheckoutRequestID: payment.json().ConversationID
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("TRANSACTION_NOT_FOUND");
  });
});
