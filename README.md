# Daraja Local

[![Daraja Local](/images/daraja-local-poster.png "Unofficial local sandbox for M-Pesa Daraja API integrations. Build, test, and debug STK Push flows, callbacks, transaction states, and payment edge cases locally before going live.")](https://daraja-local.chanansystems.co.ke)



Daraja Local is a local npm/CLI-first emulator for Safaricom Daraja APIs.

> Unofficial local sandbox for M-Pesa Daraja API integrations. Build, test, and debug STK Push flows, callbacks, transaction states, and payment edge cases locally before going live.

> Copyright (C) 2026 [Alex Muturi] This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, version 3.


## Daraja Local How-To Guides


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

Unless changed by passing `--port <YOUR_PORT>` to the start command , Daraja Local listens on:

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

## Run

```bash
npm install
npm run dev
```

The server starts at `http://127.0.0.1:8080` by default.

## CLI

```bash
npm run build
npm link
daraja-local start
daraja-local transactions
daraja-local approve <CheckoutRequestID>
daraja-local fail <CheckoutRequestID>
daraja-local timeout <CheckoutRequestID>
```

Set `DARAJA_LOCAL_URL` or pass `--base-url` for CLI commands that call an already-running emulator.

## How-To Guides

Detailed feature guides live in [how-to/README.md](./how-to/README.md).

## Endpoints

- `GET /health`
- `GET /version`
- `GET /oauth/v1/generate`
- `POST /mpesa/stkpush/v1/processrequest`
- `POST /mpesa/stkpushquery/v1/query`
- `POST /mpesa/c2b/v1/registerurl`
- `POST /mpesa/c2b/v1/simulate`
- `POST /mpesa/b2c/v1/paymentrequest`
- `POST /mpesa/b2b/v1/paymentrequest`
- `POST /mpesa/b2caccounttopup/v1/request`
- `GET /simulator/transactions`
- `GET /simulator/transactions/:id`
- `POST /simulator/stk/:id/approve`
- `POST /simulator/stk/:id/fail`
- `POST /simulator/stk/:id/timeout`
- `POST /simulator/stk/:id/replay-callback`
- `POST /simulator/payments/:id/approve`
- `POST /simulator/payments/:id/fail`
- `POST /simulator/payments/:id/timeout`
- `POST /simulator/payments/:id/replay-callback`
