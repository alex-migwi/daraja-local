import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server/create-server.js";
import { authHeaders, RecordingCallbackDispatcher } from "./helpers.js";

const resultUrl = "http://callback.test/result";
const timeoutUrl = "http://callback.test/timeout";

const b2cPayload = {
  InitiatorName: "testapi",
  SecurityCredential: "credential",
  CommandID: "BusinessPayment",
  Amount: 1000,
  PartyA: "600000",
  PartyB: "254712345678",
  Remarks: "Local payout",
  QueueTimeOutURL: timeoutUrl,
  ResultURL: resultUrl,
  Occasion: "Test"
};

const b2bPayload = {
  Initiator: "testapi",
  SecurityCredential: "credential",
  CommandID: "BusinessPayBill",
  SenderIdentifierType: "4",
  ReceiverIdentifierType: "4",
  Amount: 1000,
  PartyA: "600000",
  PartyB: "600001",
  AccountReference: "ACC-001",
  Remarks: "Supplier payment",
  QueueTimeOutURL: timeoutUrl,
  ResultURL: resultUrl
};

const accountTopUpPayload = {
  InitiatorName: "testapi",
  SecurityCredential: "credential",
  CommandID: "BusinessPayment",
  Amount: 1000,
  PartyA: "600000",
  PartyB: "600001",
  AccountReference: "ACC-001",
  Remarks: "Account top-up",
  QueueTimeOutURL: timeoutUrl,
  ResultURL: resultUrl
};

describe("business payment endpoints", () => {
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

  it.each([
    ["/mpesa/b2c/v1/paymentrequest", /^B2C_/, b2cPayload],
    ["/mpesa/b2b/v1/paymentrequest", /^B2B_/, b2bPayload],
    ["/mpesa/b2caccounttopup/v1/request", /^B2C_ACCOUNT_TOPUP_/, accountTopUpPayload]
  ])("accepts %s and sends a result callback through the simulator", async (url, prefix, payload) => {
    const accepted = await server.app.inject({ method: "POST", url, headers, payload });

    expect(accepted.statusCode).toBe(200);
    const conversationId = accepted.json().ConversationID;
    expect(conversationId).toMatch(prefix);

    const approve = await server.app.inject({
      method: "POST",
      url: `/simulator/payments/${conversationId}/approve`
    });

    expect(approve.statusCode).toBe(200);
    expect(approve.json().status).toBe("SUCCESS");
    expect(approve.json()).not.toHaveProperty("merchantRequestId");
    expect(approve.json()).not.toHaveProperty("checkoutRequestId");
    expect(dispatcher.attempts).toHaveLength(1);
    expect(dispatcher.attempts[0]?.url).toBe(resultUrl);
    expect(dispatcher.attempts[0]?.payload).toMatchObject({
      Result: {
        ResultCode: 0,
        ConversationID: conversationId,
        ResultParameters: {
          ResultParameter: expect.arrayContaining([{ Key: "TransactionAmount", Value: 1000 }])
        }
      }
    });
  });

  it.each([
    ["unsupported command", { ...b2cPayload, CommandID: "BusinessPayBill" }],
    ["invalid recipient phone", { ...b2cPayload, PartyB: "0712345678" }],
    ["missing initiator", (({ InitiatorName: _, ...payload }) => payload)(b2cPayload)]
  ])("rejects a B2C request with %s", async (_case, payload) => {
    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/b2c/v1/paymentrequest",
      headers,
      payload
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_B2C_REQUEST");
  });

  it("rejects unsupported B2Pochi fields", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/b2c/v1/paymentrequest",
      headers,
      payload: { ...b2cPayload, OriginatorConversationID: "pochi-request" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_B2C_REQUEST");
  });

  it.each([
    ["unsupported command", { ...b2bPayload, CommandID: "BusinessPayment" }],
    ["missing account reference", (({ AccountReference: _, ...payload }) => payload)(b2bPayload)],
    [
      "missing receiver identifier type",
      (({ ReceiverIdentifierType: _, ...payload }) => payload)(b2bPayload)
    ]
  ])("rejects a B2B request with %s", async (_case, payload) => {
    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/b2b/v1/paymentrequest",
      headers,
      payload
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_B2B_REQUEST");
  });

  it.each([
    ["/mpesa/b2c/v1/paymentrequest", "INVALID_B2C_REQUEST", b2cPayload],
    ["/mpesa/b2b/v1/paymentrequest", "INVALID_B2B_REQUEST", b2bPayload],
    [
      "/mpesa/b2caccounttopup/v1/request",
      "INVALID_B2C_ACCOUNT_TOPUP_REQUEST",
      accountTopUpPayload
    ]
  ])("rejects invalid amounts at %s", async (url, errorCode, payload) => {
    for (const Amount of ["1000", true, 1.5]) {
      const response = await server.app.inject({
        method: "POST",
        url,
        headers,
        payload: { ...payload, Amount }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe(errorCode);
    }
  });

  it("normalizes the documented legacy B2B receiver identifier spelling", async () => {
    const { ReceiverIdentifierType, ...payload } = b2bPayload;
    const accepted = await server.app.inject({
      method: "POST",
      url: "/mpesa/b2b/v1/paymentrequest",
      headers,
      payload: { ...payload, RecieverIdentifierType: ReceiverIdentifierType }
    });

    expect(accepted.statusCode).toBe(200);
    const transaction = await server.app.inject({
      method: "GET",
      url: `/simulator/transactions/${accepted.json().ConversationID}`
    });

    expect(transaction.json().rawRequest).toMatchObject({ ReceiverIdentifierType: "4" });
    expect(transaction.json().rawRequest).not.toHaveProperty("RecieverIdentifierType");
  });

  it("sends timeout callbacks to QueueTimeOutURL", async () => {
    const accepted = await server.app.inject({
      method: "POST",
      url: "/mpesa/b2c/v1/paymentrequest",
      headers,
      payload: b2cPayload
    });

    const timeout = await server.app.inject({
      method: "POST",
      url: `/simulator/payments/${accepted.json().ConversationID}/timeout`
    });

    expect(timeout.statusCode).toBe(200);
    expect(timeout.json().status).toBe("TIMEOUT");
    expect(dispatcher.attempts).toHaveLength(1);
    expect(dispatcher.attempts[0]).toMatchObject({
      url: timeoutUrl,
      role: "BUSINESS_TIMEOUT",
      payload: {
        Result: {
          ResultCode: timeout.json().resultCode,
          ResultDesc: timeout.json().resultDesc,
          ConversationID: accepted.json().ConversationID
        }
      }
    });
  });

  it("sends failed payment results to ResultURL", async () => {
    const accepted = await server.app.inject({
      method: "POST",
      url: "/mpesa/b2c/v1/paymentrequest",
      headers,
      payload: b2cPayload
    });

    const failed = await server.app.inject({
      method: "POST",
      url: `/simulator/payments/${accepted.json().ConversationID}/fail`
    });

    expect(failed.statusCode).toBe(200);
    expect(failed.json().status).toBe("FAILED");
    expect(dispatcher.attempts).toHaveLength(1);
    expect(dispatcher.attempts[0]?.url).toBe(resultUrl);
  });

  it("does not include B2C account balances in B2B result callbacks", async () => {
    const accepted = await server.app.inject({
      method: "POST",
      url: "/mpesa/b2b/v1/paymentrequest",
      headers,
      payload: b2bPayload
    });

    await server.app.inject({
      method: "POST",
      url: `/simulator/payments/${accepted.json().ConversationID}/approve`
    });

    expect(dispatcher.attempts[0]?.url).toBe(resultUrl);
    const result = dispatcher.attempts[0]?.payload as {
      Result: { ResultParameters: { ResultParameter: Array<{ Key: string }> } };
    };
    const keys = result.Result.ResultParameters.ResultParameter.map(({ Key }) => Key);
    expect(keys).not.toContain("B2CWorkingAccountAvailableFunds");
    expect(keys).not.toContain("B2CUtilityAccountAvailableFunds");
  });
});
