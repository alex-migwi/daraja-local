# Daraja Local How-To Guides

[![Daraja Local](/images/daraja-local-poster.png "Unofficial local sandbox for M-Pesa Daraja API integrations. Build, test, and debug STK Push flows, callbacks, transaction states, and payment edge cases locally before going live.")](https://daraja-local.chanansystems.co.ke)


This folder contains practical guides for using Daraja Local during local M-Pesa Daraja development.

## Guides

- [Install and Link the CLI](./install-and-link-cli.md)
- [Start the Local Emulator](./start-the-emulator.md)
- [Generate OAuth Tokens](./oauth.md)
- [Create STK Push Requests](./stk-push.md)
- [Query STK Transaction Status](./stk-query.md)
- [Use C2B Register URL and Simulation](./c2b.md)
- [Use B2C Payments](./b2c.md)
- [Use B2B Payments](./b2b.md)
- [Use B2C Account Top-Up](./b2c-account-top-up.md)
- [Approve, Fail, and Timeout Transactions](./simulate-outcomes.md)
- [Receive and Replay Callbacks](./callbacks.md)
- [Inspect Transactions](./inspect-transactions.md)
- [Troubleshooting](./troubleshooting.md)

## Default Server URL

Unless changed, Daraja Local listens on:

```txt
http://127.0.0.1:8080
```

CLI commands that talk to a running server use that same URL by default.

## Main STK Push Flow

```txt
1. Your app -> Daraja Local
   POST /mpesa/stkpush/v1/processrequest

2. Daraja Local -> Your app
   Returns CheckoutRequestID immediately.

3. Your app
   Saves CheckoutRequestID and marks the payment PENDING.

4. Developer or automated test -> Daraja Local
   Calls approve, fail, or timeout for that CheckoutRequestID.

5. Daraja Local -> Your callback URL
   POSTs the final transaction result.

6. Your app
   Updates the payment status from the callback.
```
