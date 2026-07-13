# Use B2B Payments

B2B sends money from one business shortcode to another business shortcode.

## Flow

```txt
1. Your app -> Daraja Local
   POST /mpesa/b2b/v1/paymentrequest
   Sends sender shortcode, receiver shortcode, amount, command, ResultURL, and QueueTimeOutURL.

2. Daraja Local -> Your app
   Immediately returns ConversationID and OriginatorConversationID.
   Your app should save ConversationID as a pending business payment.

3. Daraja Local
   Stores the transaction as PENDING.

4. Developer or test -> Daraja Local
   Approves, fails, or times out the transaction using ConversationID.

5. Daraja Local -> Your ResultURL
   POSTs the final result payload.

6. Your app
   Reconciles the payment from the callback.
```

## Request

```bash
curl -X POST http://127.0.0.1:8080/mpesa/b2b/v1/paymentrequest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"Initiator":"testapi","SecurityCredential":"credential","CommandID":"BusinessPayBill","SenderIdentifierType":"4","ReceiverIdentifierType":"4","Amount":5000,"PartyA":"600000","PartyB":"600001","AccountReference":"SUP-001","Remarks":"Supplier payment","QueueTimeOutURL":"http://127.0.0.1:3000/b2b/timeout","ResultURL":"http://127.0.0.1:3000/b2b/result"}'
```

## Simulate Completion

```bash
daraja-local approve-payment <ConversationID>
```
