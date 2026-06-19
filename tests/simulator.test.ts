import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server/create-server.js";
import { validStkRequest } from "./helpers.js";

describe("simulator endpoints", () => {
  let server: Awaited<ReturnType<typeof createServer>>;
  let callbackServer: Awaited<ReturnType<typeof createServer>>["app"];
  const callbacks: unknown[] = [];

  beforeEach(async () => {
    callbacks.length = 0;
    server = await createServer();
    callbackServer = (await createServer()).app;
    callbackServer.post("/callback", async (request) => {
      callbacks.push(request.body);
      return { received: true };
    });
    await callbackServer.listen({ host: "127.0.0.1", port: 0 });
  });

  afterEach(async () => {
    await server.app.close();
    await callbackServer.close();
  });

  it("approves a transaction and sends a success callback", async () => {
    const address = callbackServer.server.address();
    const port = address && typeof address === "object" ? address.port : 0;
    const callbackUrl = `http://127.0.0.1:${port}/callback`;
    const push = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
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
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0]).toMatchObject({
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
      payload: validStkRequest()
    });
    const checkoutRequestId = push.json().CheckoutRequestID;

    await server.app.inject({ method: "POST", url: `/simulator/stk/${checkoutRequestId}/fail` });
    const approve = await server.app.inject({ method: "POST", url: `/simulator/stk/${checkoutRequestId}/approve` });

    expect(approve.statusCode).toBe(409);
    expect(approve.json().error.code).toBe("INVALID_TRANSACTION_TRANSITION");
  });
});
