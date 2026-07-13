# Inspect Transactions

Use the simulator transaction endpoints or CLI to inspect the in-memory transaction store.

## Flow

```txt
1. Your app creates one or more supported payment requests.

2. Daraja Local stores each request as an in-memory transaction.

3. You list or fetch transactions through the simulator API or CLI.

4. Daraja Local returns raw request data, current status, and callback attempts.

5. You use this information to debug your local integration.
```

Inspection endpoints are for development and testing. Your production app should depend on Daraja responses and callbacks, not simulator inspection APIs.

## List Transactions With CLI

```bash
daraja-local transactions
```

With a custom base URL:

```bash
daraja-local transactions --base-url http://127.0.0.1:9090
```

## List Transactions With HTTP

```bash
curl http://127.0.0.1:8080/simulator/transactions
```

## Get One Transaction

```bash
curl http://127.0.0.1:8080/simulator/transactions/ws_CO_1760000000000_abcd1234ef56
```

## Transaction Fields

Important fields:

- `trackingId`: internal lookup key used by the inspection endpoints.
- `checkoutRequestId` and `merchantRequestId`: STK identifiers.
- `conversationId` and `originatorConversationId`: C2B, B2C, B2B, and account-top-up identifiers.
- `status`: `PENDING`, `SUCCESS`, `FAILED`, or `TIMEOUT`.
- `rawRequest`: validated public request for the transaction's flow.
- `callbackAttempts`: callback URL, role, payload, response, and delivery result history.

## Storage Lifetime

Transactions are stored in memory for this MVP. They disappear when the emulator process stops.
