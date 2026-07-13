# Daraja compatibility contract

Daraja Local is an unofficial emulator. Safaricom's current Daraja portal is the authority; this matrix records only the contract surface verified for this project.

| Flow | Verified contract | Daraja Local target | Classification |
|---|---|---|---|
| OAuth | `GET /oauth/v1/generate?grant_type=client_credentials`; HTTP Basic consumer credentials; response contains `access_token` and `expires_in`. | Validate configured credentials, issue an expiring local token, and require that token on `/mpesa` routes. | Verified shape; local authentication semantics |
| STK Push | `POST /mpesa/stkpush/v1/processrequest`; Bearer token; request carries shortcode, password, timestamp, transaction type, amount, parties, phone, callback URL, account reference, and description. The immediate response is an acknowledgement with merchant and checkout request IDs. | Validate the public request, create `PENDING`, and return the acknowledgement. Never treat acknowledgement as payment success. | Verified |
| STK Query | `POST /mpesa/stkpushquery/v1/query`; request carries shortcode, password, timestamp, and `CheckoutRequestID`. | Resolve only an STK transaction by checkout request ID and report its simulated state. Exact pending/result wording is emulator-defined unless verified against the active portal version. | Verified request; version-sensitive response details |
| STK callback | Safaricom posts `Body.stkCallback` with merchant and checkout request IDs, `ResultCode`, and `ResultDesc`; successful callbacks include metadata such as amount, receipt, date, and phone. | Send this envelope after a terminal simulator action. Metadata belongs only on success. | Verified shape; result-code catalogue not claimed |
| C2B Register URL | `POST /mpesa/c2b/v1/registerurl`; request contains `ShortCode`, `ResponseType`, `ConfirmationURL`, and `ValidationURL`. `ResponseType` is the default action when validation times out; it does not enable or disable validation. | Store registration per shortcode and return the documented acknowledgement identifiers and description. | Verified |
| C2B Simulate | `POST /mpesa/c2b/v1/simulate`; request identifies command, amount, MSISDN, shortcode, and optional bill reference. This is a sandbox operation. | Create a local C2B transaction and drive validation/confirmation callbacks from the stored registration. | Verified core shape; accepted-response details version-sensitive |
| C2B validation | The validation URL receives transaction details. The receiver returns `ResultCode` and `ResultDesc`. `ResponseType` applies only when validation cannot produce a decision. | Record the validation request and HTTP response, then accept, reject, or apply the registered timeout fallback. | Verified core behavior; rejection codes and post-rejection notification behavior are version-sensitive |
| C2B confirmation | The confirmation URL receives transaction details, including transaction ID/time/amount, shortcode, bill reference, balance, and MSISDN. | Send confirmation after validation acceptance or the applicable `Completed` fallback. Not sending it after explicit rejection is a documented emulator choice. | Verified core shape; optional fields and rejected-transaction behavior are version-sensitive |
| B2C | `POST /mpesa/b2c/v1/paymentrequest`; Bearer token; request includes initiator credentials, command, amount, parties, remarks, timeout URL, result URL, and optional occasion. Acceptance is asynchronous and returns conversation identifiers. | Create `PENDING`; later send either a result callback or queue-timeout callback. | Verified |
| B2B | `POST /mpesa/b2b/v1/paymentrequest`; Bearer token; acceptance is asynchronous and uses conversation identifiers, a result URL, and a queue-timeout URL. | Create `PENDING`; keep B2B identifiers and transitions separate from STK and B2C. | Verified core behavior; command-specific fields version-sensitive |
| B2C Account Top Up | Older Safaricom material describes a separate business-account top-up operation. Its name, route, command set, and availability are version- and product-sensitive. | Keep the current route explicitly experimental until it is confirmed in the active Daraja portal for the intended product. Do not advertise strict parity. | Ambiguous / version-sensitive |

## Compatibility rules

- Public payload names and casing follow the active Safaricom contract; internal models may differ.
- Immediate acceptance and terminal outcome are separate events.
- Flow-specific identifiers are not interchangeable.
- Result codes are added only with official evidence for the relevant flow and portal version.
- The simulator's generic failure and timeout result codes are local test values, not a Safaricom result-code catalogue.
- B2Pochi and generic M-PESA utility APIs are outside the current emulator scope.
- Community examples may inform tests and ergonomics, but cannot define compatibility.

## Official sources

- [Safaricom Daraja Developer Portal](https://developer.safaricom.co.ke/)
- [Safaricom Business to Customer API](https://developer.safaricom.co.ke/apis/BusinessToCustomer)
- [Safaricom M-PESA integration specification](https://www.safaricom.co.ke/images/Downloads/Tender_Documents/EOI_Safaricom_M-PESA_Integration_V1_002.pdf)
