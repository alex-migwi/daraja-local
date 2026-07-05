# Generate OAuth Tokens

Daraja Local implements a fake OAuth endpoint compatible with the shape of Daraja token responses.

## Flow

```txt
1. Your app prepares Basic Auth credentials.

2. Your app -> Daraja Local
   GET /oauth/v1/generate
   Sends the Basic Auth header.

3. Daraja Local validates that Basic Auth is present.
   It does not call Safaricom and does not validate real credentials.

4. Daraja Local -> Your app
   Returns a fake access token and expiry.

5. Your app can use that token in local requests the same way it would use a Daraja token.
```

## Endpoint

```http
GET /oauth/v1/generate
```

## Example

```bash
curl -X GET "http://127.0.0.1:8080/oauth/v1/generate?grant_type=client_credentials" -H "Authorization: Basic Y29uc3VtZXJfa2V5OmNvbnN1bWVyX3NlY3JldA=="
```

Expected response:

```json
{
  "access_token": "daraja-local-token-...",
  "expires_in": "3599"
}
```

## Notes

- Credentials are not checked against Safaricom.
- Daraja Local never calls real Safaricom APIs.
- The endpoint requires a Basic Auth header so client applications exercise the same authentication flow they use with Daraja.
- The default `> curl -X GET "http://127.0.0.1:8080/oauth/v1/generate?grant_type=client_credentials" -H "Authorization: Basic Y29uc3VtZXJfa2V5OmNvbnN1bWVyX3NlY3JldA=="`

- You need to set the string `consumer-key` and `consumer-secret`, in the `.env` file so that the sandbox can crosscheck if you have encoded it into `Base64`, correctly by decodiing the HTTP `header: Authorization: Basic <base64-encoded-string>` and comparing the resulting values.


## Configure Token Expiry

PowerShell:

```powershell
$env:DARAJA_LOCAL_TOKEN_EXPIRES_IN = "120"
daraja-local start
```
