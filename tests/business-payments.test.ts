import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server/create-server.js";

describe("business payment endpoints", () => {
  let server: Awaited<ReturnType<typeof createServer>>;
  let callbackServer: Awaited<ReturnType<typeof createServer>>["app"];
  const callbacks: unknown[] = [];

  beforeEach(async () => {
    callbacks.length = 0;
    server = await createServer();
    callbackServer = (await createServer()).app;
    callbackServer.post("/result", async (request) => {
      callbacks.push(request.body);
      return { ResultCode: 0, ResultDesc: "Accepted" };
    });
    callbackServer.post("/timeout", async () => ({ ResultCode: 0, ResultDesc: "Accepted" }));
    await callbackServer.listen({ host: "127.0.0.1", port: 0 });
  });

  afterEach(async () => {
    await server.app.close();
    await callbackServer.close();
  });

  it.each([
    ["/mpesa/b2c/v1/paymentrequest", /^B2C_/],
    ["/mpesa/b2b/v1/paymentrequest", /^B2B_/],
    ["/mpesa/b2caccounttopup/v1/request", /^B2C_ACCOUNT_TOPUP_/]
  ])("accepts %s and sends a result callback through the simulator", async (url, prefix) => {
    const address = callbackServer.server.address();
    const port = address && typeof address === "object" ? address.port : 0;
    const resultUrl = `http://127.0.0.1:${port}/result`;
    const timeoutUrl = `http://127.0.0.1:${port}/timeout`;

    const accepted = await server.app.inject({
      method: "POST",
      url,
      payload: {
        InitiatorName: "testapi",
        SecurityCredential: "credential",
        CommandID: "BusinessPayment",
        Amount: 1000,
        PartyA: "600000",
        PartyB: url.includes("b2c/v1") ? "254712345678" : "600001",
        Remarks: "Local payout",
        QueueTimeOutURL: timeoutUrl,
        ResultURL: resultUrl,
        Occassion: "Test",
        AccountReference: "ACC-001"
      }
    });

    expect(accepted.statusCode).toBe(200);
    const conversationId = accepted.json().ConversationID;
    expect(conversationId).toMatch(prefix);

    const approve = await server.app.inject({
      method: "POST",
      url: `/simulator/payments/${conversationId}/approve`
    });

    expect(approve.statusCode).toBe(200);
    expect(approve.json().status).toBe("SUCCESS");
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0]).toMatchObject({
      Result: {
        ResultCode: 0,
        ConversationID: conversationId,
        ResultParameters: {
          ResultParameter: expect.arrayContaining([{ Key: "TransactionAmount", Value: 1000 }])
        }
      }
    });
  });
});
