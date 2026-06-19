import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server/create-server.js";
import { validStkRequest } from "./helpers.js";

describe("stk endpoints", () => {
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    server = await createServer();
  });

  afterEach(async () => {
    await server.app.close();
  });

  it("creates a pending transaction for a valid STK push", async () => {
    const push = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      payload: validStkRequest()
    });

    expect(push.statusCode).toBe(200);
    const body = push.json();
    expect(body.ResponseCode).toBe("0");
    expect(body.CheckoutRequestID).toMatch(/^ws_CO_/);

    const query = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpushquery/v1/query",
      payload: { CheckoutRequestID: body.CheckoutRequestID }
    });

    expect(query.statusCode).toBe(200);
    expect(query.json()).toMatchObject({
      CheckoutRequestID: body.CheckoutRequestID,
      ResultCode: "9999"
    });
  });

  it("rejects invalid STK push payloads", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      payload: validStkRequest({ Amount: -1 })
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_STK_REQUEST");
  });

  it("returns not found for unknown checkout request IDs", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpushquery/v1/query",
      payload: { CheckoutRequestID: "missing" }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("TRANSACTION_NOT_FOUND");
  });
});
