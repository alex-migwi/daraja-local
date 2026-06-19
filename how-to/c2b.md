# Use C2B Register URL and Simulation

C2B covers customer-initiated PayBill or Till payments. In real Daraja, the customer starts the payment from M-PESA, then Daraja sends validation and confirmation callbacks to your registered URLs.

## Flow

```txt
1. Your app -> Daraja Local
   POST /mpesa/c2b/v1/registerurl
   Registers ValidationURL and ConfirmationURL for a shortcode.

2. Daraja Local
   Stores those URLs in memory for the current server process.

3. Developer or test -> Daraja Local
   POST /mpesa/c2b/v1/simulate
   Sends shortcode, amount, customer phone, command, and optional bill reference.

4. Daraja Local
   Creates a C2B transaction and builds a Daraja-style confirmation payload.

5. Daraja Local -> Your ConfirmationURL
   POSTs the simulated customer payment.

6. Your app
   Uses TransID, BillRefNumber, MSISDN, and amount to update its payment record.
```

## Register URLs

```bash
curl -X POST http://127.0.0.1:8080/mpesa/c2b/v1/registerurl ^
  -H "Content-Type: application/json" ^
  -d "{\"ShortCode\":\"600000\",\"ResponseType\":\"Completed\",\"ConfirmationURL\":\"http://127.0.0.1:3000/c2b/confirmation\",\"ValidationURL\":\"http://127.0.0.1:3000/c2b/validation\"}"
```

## Simulate Customer Payment

```bash
curl -X POST http://127.0.0.1:8080/mpesa/c2b/v1/simulate ^
  -H "Content-Type: application/json" ^
  -d "{\"ShortCode\":\"600000\",\"CommandID\":\"CustomerPayBillOnline\",\"Amount\":250,\"Msisdn\":\"254712345678\",\"BillRefNumber\":\"INV-250\"}"
```

## Notes

- URLs are stored in memory and disappear when the emulator restarts.
- The current MVP sends the confirmation callback directly.
- Validation callback behavior can be expanded later for accept/reject scenarios.
