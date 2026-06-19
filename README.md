# Daraja Local

Daraja Local is a local npm/CLI-first emulator for Safaricom Daraja APIs.

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
