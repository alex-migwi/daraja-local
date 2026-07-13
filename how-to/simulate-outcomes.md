# Approve, Fail, and Timeout Transactions

Simulator endpoints let you manually move a pending STK transaction into a final state.

## Flow

```txt
1. Your app creates an STK Push request.

2. Daraja Local returns CheckoutRequestID and stores the transaction as PENDING.

3. You choose the customer outcome you want to test:
   approve, fail, or timeout.

4. Daraja Local validates the state transition.
   Only PENDING transactions can move to a final state.

5. Daraja Local updates the transaction status.

6. Daraja Local sends a callback to the transaction's original CallBackURL.

7. Your app receives the callback and updates its own database.
```

This replaces the real phone prompt step during local development.

## CLI Commands

For STK Push:

```bash
daraja-local approve <CheckoutRequestID>
daraja-local fail <CheckoutRequestID>
daraja-local timeout <CheckoutRequestID>
```

For B2C and B2B, plus the experimental B2C account top-up flow:

```bash
daraja-local approve-payment <ConversationID>
daraja-local fail-payment <ConversationID>
daraja-local timeout-payment <ConversationID>
```

If your emulator runs somewhere other than `http://127.0.0.1:8080`:

```bash
daraja-local approve <CheckoutRequestID> --base-url http://127.0.0.1:9090
```

Or:

```powershell
$env:DARAJA_LOCAL_URL = "http://127.0.0.1:9090"
daraja-local approve <CheckoutRequestID>
```

## HTTP Endpoints

```http
POST /simulator/stk/:id/approve
POST /simulator/stk/:id/fail
POST /simulator/stk/:id/timeout
POST /simulator/payments/:id/approve
POST /simulator/payments/:id/fail
POST /simulator/payments/:id/timeout
```

For `/simulator/stk/*`, `:id` is the `CheckoutRequestID`. For `/simulator/payments/*`, it is the `ConversationID`.

## Approve

```bash
curl -X POST http://127.0.0.1:8080/simulator/stk/ws_CO_1783264676434_f82d0085e2c8/approve
```

Final state:

```txt
SUCCESS
```

Result code:

```txt
0
```

## Fail

```bash
curl -X POST http://127.0.0.1:8080/simulator/stk/ws_CO_1760000000000_abcd1234ef56/fail
```

Final state:

```txt
FAILED
```

## Timeout

```bash
curl -X POST http://127.0.0.1:8080/simulator/stk/ws_CO_1760000000000_abcd1234ef56/timeout
```

Final state:

```txt
TIMEOUT
```

## State Rules

Only pending transactions can be moved to a final state.

Allowed:

```txt
PENDING -> SUCCESS
PENDING -> FAILED
PENDING -> TIMEOUT
```

Rejected:

```txt
FAILED -> SUCCESS
SUCCESS -> TIMEOUT
TIMEOUT -> FAILED
```
