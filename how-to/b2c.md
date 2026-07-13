# Use B2C Payments

B2C sends money from a business shortcode to a customer phone number. Common use cases include refunds, salary payments, withdrawals, and rewards.

B2Pochi requests are not supported by this route.

## Flow

```txt
1. Your app -> Daraja Local
   POST /mpesa/b2c/v1/paymentrequest
   Sends initiator details, amount, business shortcode, customer phone, ResultURL, and QueueTimeOutURL.

2. Daraja Local -> Your app
   Immediately returns ConversationID and OriginatorConversationID.
   Your app should save ConversationID as a pending payout.

3. Daraja Local
   Stores the transaction as PENDING.
   No real M-PESA movement happens.

4. Developer or test -> Daraja Local
   Calls approve-payment, fail-payment, or timeout-payment using ConversationID.

5. Daraja Local -> Your ResultURL
   POSTs a Daraja-style result payload.

6. Your app
   Updates the payout status using ConversationID and ResultCode.
```

## Request

```bash
curl -X POST http://127.0.0.1:8080/mpesa/b2c/v1/paymentrequest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"InitiatorName":"testapi","SecurityCredential":"credential","CommandID":"BusinessPayment","Amount":1000,"PartyA":"600000","PartyB":"254712345678","Remarks":"Refund","QueueTimeOutURL":"http://127.0.0.1:3000/b2c/timeout","ResultURL":"http://127.0.0.1:3000/b2c/result","Occasion":"Refund"}'
```

## Simulate Completion

```bash
daraja-local approve-payment <ConversationID>
daraja-local fail-payment <ConversationID>
daraja-local timeout-payment <ConversationID>
```

HTTP alternatives:

```http
POST /simulator/payments/:id/approve
POST /simulator/payments/:id/fail
POST /simulator/payments/:id/timeout
```
