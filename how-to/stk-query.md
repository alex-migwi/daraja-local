# Query STK Transaction Status

Use STK Query to check the current local state of a transaction.

## Flow

```txt
1. Your app already has a CheckoutRequestID from STK Push.

2. Your app -> Daraja Local
   POST /mpesa/stkpushquery/v1/query
   Sends CheckoutRequestID.

3. Daraja Local
   Looks up the in-memory transaction.

4. Daraja Local -> Your app
   Returns the current transaction result.
```

STK Query is useful for polling or reconciliation, but the callback should still be treated as the main source of final payment status.

## Endpoint

```http
POST /mpesa/stkpushquery/v1/query
```

## Example

```bash
curl -X POST http://127.0.0.1:8080/mpesa/stkpushquery/v1/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN_FROM_OAUTH_REQUEST>" \
  -d "{\"BusinessShortCode\":174379,\"Password\":\"GENERATED_BASE64_PASSWORD\",\"Timestamp\":\"20260705123000\",\"CheckoutRequestID\":\"ws_CO_1760000000000_abcd1234ef56\"}"
```

## Important to note
- How to generate the missing values:
1. Timestamp: Use the current date/time (e.g., if now is July 5, 2026, 12:30:00, then 20260705123000). 
2. Password: Base64 encode the string: 174379 + YOUR_PASSKEY + 20260705123000.
Example 
```javascript
Buffer.from("174379" + "your_passkey" + "20260705123000").toString("base64") 
```
Safaricom validates the password construction. Daraja Local validates only that the field is present because it does not hold a production passkey.



## Pending Response

```json
{
  "ResponseCode": "0",
  "ResponseDescription": "The service request has been accepted successfully",
  "MerchantRequestID": "1760000000000-abcd1234",
  "CheckoutRequestID": "ws_CO_1760000000000_abcd1234ef56",
  "ResultCode": "9999",
  "ResultDesc": "The transaction is being processed"
}
```

## Success Response

After approval:

```json
{
  "ResponseCode": "0",
  "ResponseDescription": "The service request has been accepted successfully",
  "MerchantRequestID": "1760000000000-abcd1234",
  "CheckoutRequestID": "ws_CO_1760000000000_abcd1234ef56",
  "ResultCode": "0",
  "ResultDesc": "The service request is processed successfully."
}
```
