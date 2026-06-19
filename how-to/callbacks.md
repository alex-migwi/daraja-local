# Receive and Replay Callbacks

Daraja Local sends an HTTP callback when you approve, fail, or timeout an STK transaction.

## Flow

```txt
1. Your app includes CallBackURL in the original STK Push request.

2. Daraja Local stores that callback URL on the pending transaction.

3. You approve, fail, timeout, or replay the transaction.

4. Daraja Local builds a Daraja-style callback payload from the transaction state.

5. Daraja Local -> Your callback URL
   Sends an HTTP POST with JSON.

6. Your app receives the callback.

7. Your app updates its payment record using CheckoutRequestID and ResultCode.

8. Daraja Local records the callback attempt on the transaction.
```

Your callback handler should be idempotent. A replay sends the callback again for the same `CheckoutRequestID`.

## Configure the Callback URL

The callback URL comes from the original STK Push request:

```json
{
  "CallBackURL": "http://127.0.0.1:3000/callback"
}
```

Your application should expose that URL and accept JSON `POST` requests.

## Success Callback Shape

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "1760000000000-abcd1234",
      "CheckoutRequestID": "ws_CO_1760000000000_abcd1234ef56",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 100 },
          { "Name": "MpesaReceiptNumber", "Value": "DLOCALabcd1234" },
          { "Name": "TransactionDate", "Value": 20260603101010 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}
```

## Failure and Timeout Callback Shape

Failure and timeout callbacks do not include `CallbackMetadata`.

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "1760000000000-abcd1234",
      "CheckoutRequestID": "ws_CO_1760000000000_abcd1234ef56",
      "ResultCode": 1,
      "ResultDesc": "The balance is insufficient for the transaction."
    }
  }
}
```

## Replay a Callback

```bash
curl -X POST http://127.0.0.1:8080/simulator/stk/ws_CO_1760000000000_abcd1234ef56/replay-callback
```

Replay uses the transaction's current state and sends the callback payload again.

## Callback Delivery Failures

If the callback URL is unavailable, Daraja Local records a failed callback attempt on the transaction. It does not retry automatically in the current MVP.

## Configure Callback Timeout

PowerShell:

```powershell
$env:DARAJA_LOCAL_CALLBACK_TIMEOUT_MS = "10000"
daraja-local start
```
