# Use C2B Register URL and Simulation

C2B covers customer-initiated PayBill payments. Register validation and confirmation URLs, then simulate a payment against the registered shortcode.

Obtain an access token as described in [Generate OAuth Tokens](./oauth.md) before calling either endpoint.

## Flow

```txt
1. Your app registers a ValidationURL and ConfirmationURL.
2. A test simulates a customer payment.
3. Daraja Local creates a pending C2B transaction.
4. Daraja Local posts the transaction to the ValidationURL.
5. The validation endpoint accepts or rejects it with ResultCode and ResultDesc.
6. On acceptance, Daraja Local posts the transaction to the ConfirmationURL.
```

`ResponseType` does not enable or disable validation. It controls the fallback when the validation endpoint cannot provide a valid decision:

- `Completed` continues to confirmation and completes the transaction.
- `Cancelled` skips confirmation and fails the transaction.

An explicit non-zero validation result skips confirmation and fails the transaction regardless of `ResponseType`. Skipping confirmation after explicit rejection is a documented Daraja Local behavior; Safaricom behavior can vary by product and portal version.

## Register URLs

```bash
curl -X POST "http://127.0.0.1:8080/mpesa/c2b/v1/registerurl" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "ShortCode": "600000",
    "ResponseType": "Completed",
    "ConfirmationURL": "https://example.test/mpesa/confirmation",
    "ValidationURL": "https://example.test/mpesa/validation"
  }'
```

Registrations are held in memory and are removed when the emulator restarts.

## Handle validation

The validation endpoint must return JSON containing `ResultCode` and `ResultDesc`. A string or numeric zero accepts the payment:

```json
{
  "ResultCode": 0,
  "ResultDesc": "Accepted"
}
```

A non-zero result rejects it:

```json
{
  "ResultCode": "C2B00012",
  "ResultDesc": "Invalid account number"
}
```

Connection failures, non-success HTTP responses, and malformed validation responses trigger the registered `ResponseType` fallback.

## Simulate a customer payment

```bash
curl -X POST "http://127.0.0.1:8080/mpesa/c2b/v1/simulate" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "ShortCode": "600000",
    "CommandID": "CustomerPayBillOnline",
    "Amount": 250,
    "Msisdn": "254712345678",
    "BillRefNumber": "INV-250"
  }'
```

The validation and confirmation callback payloads include `TransID`, `TransTime`, `TransAmount`, `BusinessShortCode`, `BillRefNumber`, and `MSISDN`.

`Amount` must be a positive integer and `Msisdn` must use the `254XXXXXXXXX` format.

For the authoritative Daraja contract, see the [Safaricom Daraja Developer Portal](https://developer.safaricom.co.ke/). Daraja Local's verified scope and deliberate differences are recorded in the [compatibility contract](../docs/compatibility.md).
