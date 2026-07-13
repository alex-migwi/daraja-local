# Generate OAuth Tokens

Daraja Local exposes a local OAuth endpoint with the same request and response shape used by Daraja. It validates credentials against the emulator configuration; it never sends them to Safaricom.

## Configure credentials

Set the credentials before starting the emulator:

```bash
export CONSUMER_KEY="consumer_key"
export CONSUMER_SECRET="consumer_secret"
npm run dev
```

These values default to `consumer_key` and `consumer_secret` when the variables are not set.

## Request a token

Send the configured consumer key and secret with HTTP Basic authentication and include the required `grant_type` query parameter:

```bash
curl --get "http://127.0.0.1:8080/oauth/v1/generate" \
  --data-urlencode "grant_type=client_credentials" \
  --user "consumer_key:consumer_secret"
```

Expected response:

```json
{
  "access_token": "daraja-local-token-...",
  "expires_in": "3599"
}
```

Use the returned token on every `/mpesa` request:

```http
Authorization: Bearer daraja-local-token-...
```

Missing, unknown, and expired tokens are rejected. Tokens are held in memory and become invalid when the emulator restarts.

## Configure token expiry

The default lifetime is 3,599 seconds. Override it before starting the emulator:

```bash
export DARAJA_LOCAL_TOKEN_EXPIRES_IN="120"
npm run dev
```

PowerShell:

```powershell
$env:DARAJA_LOCAL_TOKEN_EXPIRES_IN = "120"
npm run dev
```

For the authoritative Daraja contract, see the [Safaricom Daraja Developer Portal](https://developer.safaricom.co.ke/).
