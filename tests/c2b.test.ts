import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server/create-server.js";

describe("c2b endpoints", () => {
  let server: Awaited<ReturnType<typeof createServer>>;
  let callbackServer: Awaited<ReturnType<typeof createServer>>["app"];
  const callbacks: unknown[] = [];

  beforeEach(async () => {
    callbacks.length = 0;
    server = await createServer();
    callbackServer = (await createServer()).app;
    callbackServer.post("/confirmation", async (request) => {
      callbacks.push(request.body);
      return { ResultCode: 0, ResultDesc: "Accepted" };
    });
    callbackServer.post("/validation", async () => ({ ResultCode: 0, ResultDesc: "Accepted" }));
    await callbackServer.listen({ host: "127.0.0.1", port: 0 });
  });

  afterEach(async () => {
    await server.app.close();
    await callbackServer.close();
  });

  it("registers URLs and simulates a C2B confirmation callback", async () => {
    const address = callbackServer.server.address();
    const port = address && typeof address === "object" ? address.port : 0;

    const register = await server.app.inject({
      method: "POST",
      url: "/mpesa/c2b/v1/registerurl",
      payload: {
        ShortCode: "600000",
        ResponseType: "Completed",
        ConfirmationURL: `http://127.0.0.1:${port}/confirmation`,
        ValidationURL: `http://127.0.0.1:${port}/validation`
      }
    });

    expect(register.statusCode).toBe(200);
    expect(register.json().ResponseCode).toBe("0");

    const simulate = await server.app.inject({
      method: "POST",
      url: "/mpesa/c2b/v1/simulate",
      payload: {
        ShortCode: "600000",
        CommandID: "CustomerPayBillOnline",
        Amount: 250,
        Msisdn: "254712345678",
        BillRefNumber: "INV-250"
      }
    });

    expect(simulate.statusCode).toBe(200);
    expect(simulate.json().ConversationID).toMatch(/^C2B_/);
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0]).toMatchObject({
      TransAmount: "250",
      BusinessShortCode: "600000",
      BillRefNumber: "INV-250",
      MSISDN: "254712345678"
    });
  });
});
