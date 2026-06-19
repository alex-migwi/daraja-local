# Create STK Push Requests

Use the STK Push endpoint to create a pending local transaction.

## Flow

This is the local Daraja Local version of the real STK Push workflow:

```txt
1. Your app -> Daraja Local
   POST /mpesa/stkpush/v1/processrequest
   Sends phone number, amount, account reference, and callback URL.

2. Daraja Local -> Your app
   Immediately returns MerchantRequestID and CheckoutRequestID.
   Your app should save CheckoutRequestID as a pending payment.

3. Daraja Local
   Creates an in-memory PENDING transaction.
   No real Safaricom API is called and no phone prompt is sent.

4. Developer or test -> Daraja Local
   Manually approves, fails, or times out the transaction using the simulator.

5. Daraja Local -> Your callback URL
   POSTs the final result to the original CallBackURL.
   Your app should update its payment record from this callback.
```

The important integration rule is: treat the immediate STK Push response as an acknowledgement, not final payment confirmation.

## Endpoint

```http
POST /mpesa/stkpush/v1/processrequest
```

## Example Request

```bash
curl -X POST http://127.0.0.1:8080/mpesa/stkpush/v1/processrequest ^
  -H "Content-Type: application/json" ^
  -d "{\"BusinessShortCode\":\"174379\",\"Password\":\"password\",\"Timestamp\":\"20260603101010\",\"TransactionType\":\"CustomerPayBillOnline\",\"Amount\":100,\"PartyA\":\"254712345678\",\"PartyB\":\"174379\",\"PhoneNumber\":\"254712345678\",\"CallBackURL\":\"http://127.0.0.1:3000/callback\",\"AccountReference\":\"INV-001\",\"TransactionDesc\":\"Test payment\"}"
```

PowerShell alternative:

```powershell
$body = @{
  BusinessShortCode = "174379"
  Password = "password"
  Timestamp = "20260603101010"
  TransactionType = "CustomerPayBillOnline"
  Amount = 100
  PartyA = "254712345678"
  PartyB = "174379"
  PhoneNumber = "254712345678"
  CallBackURL = "http://127.0.0.1:3000/callback"
  AccountReference = "INV-001"
  TransactionDesc = "Test payment"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8080/mpesa/stkpush/v1/processrequest" `
  -ContentType "application/json" `
  -Body $body
```

## Example Response

```json
{
  "MerchantRequestID": "1760000000000-abcd1234",
  "CheckoutRequestID": "ws_CO_1760000000000_abcd1234ef56",
  "ResponseCode": "0",
  "ResponseDescription": "Success. Request accepted for processing",
  "CustomerMessage": "Success. Request accepted for processing"
}
```

Save the `CheckoutRequestID`. You will use it to query, approve, fail, or timeout the transaction.

## What Your App Should Do

After receiving the response:

```txt
1. Save CheckoutRequestID.
2. Mark the payment as PENDING.
3. Wait for the callback before marking the payment SUCCESS, FAILED, or TIMEOUT.
```

Do not mark the payment successful from the STK Push acknowledgement alone.

## Validation

Daraja Local rejects:

- missing required fields
- invalid callback URLs
- non-positive amounts
- malformed JSON
