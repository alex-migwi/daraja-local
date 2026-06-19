# Use B2C Account Top-Up

B2C Account Top-Up moves value between business-controlled M-PESA accounts for payout liquidity workflows.

## Flow

```txt
1. Your app -> Daraja Local
   POST /mpesa/b2caccounttopup/v1/request
   Sends sender party, receiver party, amount, ResultURL, and QueueTimeOutURL.

2. Daraja Local -> Your app
   Immediately returns ConversationID and OriginatorConversationID.

3. Daraja Local
   Stores the top-up request as PENDING.

4. Developer or test -> Daraja Local
   Approves, fails, or times out the request using ConversationID.

5. Daraja Local -> Your ResultURL
   Sends the final result callback.

6. Your app
   Marks the top-up successful, failed, or timed out.
```

## Request

```bash
curl -X POST http://127.0.0.1:8080/mpesa/b2caccounttopup/v1/request ^
  -H "Content-Type: application/json" ^
  -d "{\"InitiatorName\":\"testapi\",\"SecurityCredential\":\"credential\",\"CommandID\":\"BusinessPayBill\",\"Amount\":10000,\"PartyA\":\"600000\",\"PartyB\":\"600001\",\"Remarks\":\"Top up utility account\",\"QueueTimeOutURL\":\"http://127.0.0.1:3000/topup/timeout\",\"ResultURL\":\"http://127.0.0.1:3000/topup/result\",\"AccountReference\":\"TOPUP-001\"}"
```

## Simulate Completion

```bash
daraja-local approve-payment <ConversationID>
```
