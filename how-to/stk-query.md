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
curl -X POST http://127.0.0.1:8080/mpesa/stkpushquery/v1/query ^
  -H "Content-Type: application/json" ^
  -d "{\"CheckoutRequestID\":\"ws_CO_1760000000000_abcd1234ef56\"}"
```

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
