import { TransactionService } from "../src/modules/transactions/transaction.service.js";
import type { CallbackAttempt, StkRequestPayload } from "../src/modules/transactions/transaction.types.js";
import { MemoryTransactionRepository } from "../src/storage/memory/memory-transaction.repository.js";

const request: StkRequestPayload = {
  BusinessShortCode: 174379,
  Password: "password",
  Timestamp: "20260713120000",
  TransactionType: "CustomerPayBillOnline",
  Amount: 10,
  PartyA: 254700000000,
  PartyB: 174379,
  PhoneNumber: 254700000000,
  CallBackURL: "https://example.test/callback",
  AccountReference: "order-1",
  TransactionDesc: "Payment"
};

function callbackAttempt(id: string): CallbackAttempt {
  return {
    id,
    url: request.CallBackURL,
    role: "STK_RESULT",
    sentAt: new Date().toISOString(),
    ok: true,
    payload: {}
  };
}

describe("transaction concurrency", () => {
  it("allows exactly one terminal transition from PENDING", async () => {
    const repository = new MemoryTransactionRepository();
    const service = new TransactionService(repository);
    const transaction = await service.createFromStkRequest(request);

    const results = await Promise.all(
      [
        service.transitionStk(transaction.trackingId, "SUCCESS"),
        service.transitionStk(transaction.trackingId, "FAILED")
      ].map(async (transition) => {
        try {
          return { succeeded: true, transaction: await transition };
        } catch (error) {
          return { succeeded: false, error };
        }
      })
    );

    expect(results.filter(({ succeeded }) => succeeded)).toHaveLength(1);
    expect(results.filter(({ succeeded }) => !succeeded)).toHaveLength(1);
    expect((await service.getByTrackingId(transaction.trackingId)).status).not.toBe("PENDING");
  });

  it("retains callback attempts appended concurrently", async () => {
    const repository = new MemoryTransactionRepository();
    const service = new TransactionService(repository);
    const transaction = await service.createFromStkRequest(request);

    await Promise.all([
      service.addCallbackAttempt(transaction.trackingId, callbackAttempt("attempt-1")),
      service.addCallbackAttempt(transaction.trackingId, callbackAttempt("attempt-2"))
    ]);

    const updated = await service.getByTrackingId(transaction.trackingId);
    expect(updated.callbackAttempts.map(({ id }) => id).sort()).toEqual(["attempt-1", "attempt-2"]);
  });
});
