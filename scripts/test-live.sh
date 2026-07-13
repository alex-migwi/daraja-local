#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
CALLBACK_BIND_HOST="${CALLBACK_BIND_HOST:-127.0.0.1}"
CALLBACK_HOST="${CALLBACK_HOST:-127.0.0.1}"
CALLBACK_PORT="${CALLBACK_PORT:-18081}"
CONSUMER_KEY="${CONSUMER_KEY:-consumer_key}"
CONSUMER_SECRET="${CONSUMER_SECRET:-consumer_secret}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-2}"
REQUEST_TIMEOUT="${REQUEST_TIMEOUT:-20}"
CALLBACK_BASE="http://${CALLBACK_HOST}:${CALLBACK_PORT}"

for command in curl jq node base64; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

WORK_DIR="$(mktemp -d)"
EVENTS_FILE="$WORK_DIR/callbacks.jsonl"
RESPONSE_FILE="$WORK_DIR/response.json"
touch "$EVENTS_FILE"

cleanup() {
  if [[ -n "${CALLBACK_PID:-}" ]] && kill -0 "$CALLBACK_PID" 2>/dev/null; then
    kill "$CALLBACK_PID" 2>/dev/null || true
    wait "$CALLBACK_PID" 2>/dev/null || true
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  if [[ -s "$RESPONSE_FILE" ]]; then
    echo "Last response:" >&2
    jq . "$RESPONSE_FILE" 2>/dev/null || sed -n '1,120p' "$RESPONSE_FILE" >&2
  fi
  exit 1
}

pass() {
  echo "PASS: $*"
}

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local auth="${4:-}"
  local -a args

  args=(
    -sS
    --connect-timeout "$CONNECT_TIMEOUT"
    --max-time "$REQUEST_TIMEOUT"
    -o "$RESPONSE_FILE"
    -w "%{http_code}"
    -X "$method"
  )
  if [[ -n "$auth" ]]; then
    args+=(-H "Authorization: $auth")
  fi
  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" --data "$body")
  fi

  HTTP_STATUS="$(curl "${args[@]}" "$BASE_URL$path")"
}

expect_status() {
  local expected="$1"
  local label="$2"
  if [[ "$HTTP_STATUS" != "$expected" ]]; then
    fail "$label returned HTTP $HTTP_STATUS; expected $expected"
  fi
  pass "$label"
}

expect_json() {
  local expression="$1"
  local label="$2"
  if ! jq -e "$expression" "$RESPONSE_FILE" >/dev/null; then
    fail "$label"
  fi
}

event_count() {
  local path="$1"
  jq -s --arg path "$path" 'map(select(.path == $path)) | length' "$EVENTS_FILE"
}

expect_event_count() {
  local path="$1"
  local expected="$2"
  local actual
  actual="$(event_count "$path")"
  if [[ "$actual" != "$expected" ]]; then
    fail "callback $path occurred $actual times; expected $expected"
  fi
}

expect_event_body() {
  local path="$1"
  local expression="$2"
  if ! jq -s -e --arg path "$path" \
    "map(select(.path == \$path)) | last | .body | $expression" \
    "$EVENTS_FILE" >/dev/null; then
    fail "callback $path did not match: $expression"
  fi
}

CALLBACK_LOG="$EVENTS_FILE" CALLBACK_BIND_HOST="$CALLBACK_BIND_HOST" CALLBACK_PORT="$CALLBACK_PORT" \
  node --input-type=module -e '
    import { appendFileSync } from "node:fs";
    import { createServer } from "node:http";

    const logFile = process.env.CALLBACK_LOG;
    const host = process.env.CALLBACK_BIND_HOST;
    const port = Number(process.env.CALLBACK_PORT);

    const server = createServer((request, response) => {
      let raw = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => { raw += chunk; });
      request.on("end", () => {
        const path = new URL(request.url, "http://" + request.headers.host).pathname;
        if (path === "/health") {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ status: "ok" }));
          return;
        }

        let body = raw;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          body = raw;
        }
        appendFileSync(logFile, JSON.stringify({ path, method: request.method, body }) + "\n");

        if (path.includes("/validation/reject")) {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ ResultCode: "C2B00012", ResultDesc: "Invalid account number" }));
          return;
        }
        if (path.includes("/validation/unavailable")) {
          response.writeHead(503, { "content-type": "text/plain" });
          response.end("Unavailable");
          return;
        }

        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }));
      });
    });

    server.listen(port, host);
  ' &
CALLBACK_PID=$!

for _ in {1..50}; do
  if curl -fsS --connect-timeout 1 --max-time 1 "$CALLBACK_BASE/health" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$CALLBACK_PID" 2>/dev/null; then
    fail "callback receiver failed to start on $CALLBACK_BASE"
  fi
  sleep 0.1
done
curl -fsS --connect-timeout 1 --max-time 1 "$CALLBACK_BASE/health" >/dev/null ||
  fail "callback receiver was not ready on $CALLBACK_BASE"

request GET "/health"
expect_status 200 "health endpoint"
expect_json '.status == "ok"' "health response body"

request GET "/version"
expect_status 200 "version endpoint"
expect_json '.name == "daraja-local" and (.version | type == "string")' "version response body"

request POST "/mpesa/stkpush/v1/processrequest" '{}'
expect_status 401 "Bearer protection"
expect_json '.error.code == "INVALID_ACCESS_TOKEN"' "missing-token error"

BASIC_CREDENTIALS="$(printf '%s:%s' "$CONSUMER_KEY" "$CONSUMER_SECRET" | base64 | tr -d '\n')"
request GET "/oauth/v1/generate?grant_type=client_credentials" "" "Basic $BASIC_CREDENTIALS"
expect_status 200 "OAuth token generation"
expect_json '(.access_token | type == "string") and (.expires_in | type == "string")' "OAuth response"
ACCESS_TOKEN="$(jq -er '.access_token' "$RESPONSE_FILE")"
BEARER="Bearer $ACCESS_TOKEN"

TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"

stk_push() {
  local callback_path="$1"
  local reference="$2"
  local body
  body="$(jq -n \
    --arg timestamp "$TIMESTAMP" \
    --arg callback "$CALLBACK_BASE$callback_path" \
    --arg reference "$reference" \
    '{
      BusinessShortCode: 174379,
      Password: "local-password",
      Timestamp: $timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: 100,
      PartyA: 254712345678,
      PartyB: 174379,
      PhoneNumber: 254712345678,
      CallBackURL: $callback,
      AccountReference: $reference,
      TransactionDesc: "Live harness"
    }')"
  request POST "/mpesa/stkpush/v1/processrequest" "$body" "$BEARER"
  expect_status 200 "STK Push $reference"
  STK_ID="$(jq -er '.CheckoutRequestID' "$RESPONSE_FILE")"
}

stk_query() {
  local checkout_id="$1"
  local body
  body="$(jq -n \
    --arg timestamp "$TIMESTAMP" \
    --arg checkout "$checkout_id" \
    '{
      BusinessShortCode: 174379,
      Password: "local-password",
      Timestamp: $timestamp,
      CheckoutRequestID: $checkout
    }')"
  request POST "/mpesa/stkpushquery/v1/query" "$body" "$BEARER"
}

stk_push "/stk/approve" "LIVE-STK-APPROVE"
STK_APPROVE_ID="$STK_ID"
stk_query "$STK_APPROVE_ID"
expect_status 200 "pending STK Query"
expect_json '.ResultCode == "9999"' "pending STK result"
request POST "/simulator/stk/$STK_APPROVE_ID/approve"
expect_status 200 "approve STK"
expect_json '.status == "SUCCESS" and .resultCode == 0 and .callbackAttempts[-1].role == "STK_RESULT"' \
  "approved STK transaction"
expect_event_count "/stk/approve" 1
expect_event_body "/stk/approve" \
  '.Body.stkCallback.ResultCode == 0 and (.Body.stkCallback.CallbackMetadata.Item | length > 0)'
stk_query "$STK_APPROVE_ID"
expect_status 200 "successful STK Query"
expect_json '.ResultCode == "0"' "successful STK result"
request POST "/simulator/stk/$STK_APPROVE_ID/replay-callback"
expect_status 200 "replay STK callback"
expect_event_count "/stk/approve" 2

stk_push "/stk/fail" "LIVE-STK-FAIL"
STK_FAIL_ID="$STK_ID"
request POST "/simulator/stk/$STK_FAIL_ID/fail"
expect_status 200 "fail STK"
expect_json '.status == "FAILED" and .resultCode == 1' "failed STK transaction"
expect_event_body "/stk/fail" \
  '.Body.stkCallback.ResultCode == 1 and (.Body.stkCallback | has("CallbackMetadata") | not)'

stk_push "/stk/timeout" "LIVE-STK-TIMEOUT"
STK_TIMEOUT_ID="$STK_ID"
request POST "/simulator/stk/$STK_TIMEOUT_ID/timeout"
expect_status 200 "timeout STK"
expect_json '.status == "TIMEOUT" and (.resultDesc | contains("timed out"))' "timed-out STK transaction"
expect_event_count "/stk/timeout" 1
expect_event_body "/stk/timeout" \
  '.Body.stkCallback.ResultCode == 1 and (.Body.stkCallback.ResultDesc | contains("timed out"))'

request POST "/simulator/payments/$STK_APPROVE_ID/replay-callback"
expect_status 409 "cross-flow callback guard"
expect_json '.error.code == "INVALID_TRANSACTION_KIND"' "cross-flow guard error"

INVALID_STK="$(jq -n \
  --arg timestamp "$TIMESTAMP" \
  --arg callback "$CALLBACK_BASE/stk/invalid" \
  '{
    BusinessShortCode: "174379",
    Password: "local-password",
    Timestamp: $timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: 100,
    PartyA: 254712345678,
    PartyB: 174379,
    PhoneNumber: 254712345678,
    CallBackURL: $callback,
    AccountReference: "INVALID",
    TransactionDesc: "Invalid numeric type"
  }')"
request POST "/mpesa/stkpush/v1/processrequest" "$INVALID_STK" "$BEARER"
expect_status 400 "numeric-only STK validation"

register_c2b() {
  local shortcode="$1"
  local response_type="$2"
  local validation_path="$3"
  local confirmation_path="$4"
  local body
  body="$(jq -n \
    --arg shortcode "$shortcode" \
    --arg responseType "$response_type" \
    --arg validation "$CALLBACK_BASE$validation_path" \
    --arg confirmation "$CALLBACK_BASE$confirmation_path" \
    '{
      ShortCode: $shortcode,
      ResponseType: $responseType,
      ConfirmationURL: $confirmation,
      ValidationURL: $validation
    }')"
  request POST "/mpesa/c2b/v1/registerurl" "$body" "$BEARER"
  expect_status 200 "register C2B $shortcode"
}

simulate_c2b() {
  local shortcode="$1"
  local reference="$2"
  local body
  body="$(jq -n \
    --arg shortcode "$shortcode" \
    --arg reference "$reference" \
    '{
      ShortCode: $shortcode,
      CommandID: "CustomerPayBillOnline",
      Amount: 250,
      Msisdn: "254712345678",
      BillRefNumber: $reference
    }')"
  request POST "/mpesa/c2b/v1/simulate" "$body" "$BEARER"
  expect_status 200 "simulate C2B $reference"
  C2B_ID="$(jq -er '.ConversationID' "$RESPONSE_FILE")"
}

register_c2b "600000" "Completed" "/c2b/validation/accept" "/c2b/confirmation/accept"
simulate_c2b "600000" "LIVE-C2B-ACCEPT"
C2B_ACCEPT_ID="$C2B_ID"
request GET "/simulator/transactions/$C2B_ACCEPT_ID"
expect_status 200 "inspect accepted C2B"
expect_json '.status == "SUCCESS" and [.callbackAttempts[].role] == ["C2B_VALIDATION", "C2B_CONFIRMATION"]' \
  "accepted C2B lifecycle"
expect_event_body "/c2b/validation/accept" \
  '.TransactionType == "CustomerPayBillOnline" and .BusinessShortCode == "600000" and .TransAmount == "250"'
expect_event_body "/c2b/confirmation/accept" \
  '.TransactionType == "CustomerPayBillOnline" and .BusinessShortCode == "600000" and .MSISDN == "254712345678"'
expect_event_count "/c2b/confirmation/accept" 1

register_c2b "600001" "Completed" "/c2b/validation/reject" "/c2b/confirmation/reject"
simulate_c2b "600001" "LIVE-C2B-REJECT"
C2B_REJECT_ID="$C2B_ID"
request GET "/simulator/transactions/$C2B_REJECT_ID"
expect_status 200 "inspect rejected C2B"
expect_json '.status == "FAILED" and .resultCode == "C2B00012" and (.callbackAttempts | length == 1)' \
  "rejected C2B lifecycle"
expect_event_count "/c2b/confirmation/reject" 0

register_c2b "600002" "Completed" "/c2b/validation/unavailable" "/c2b/confirmation/completed"
simulate_c2b "600002" "LIVE-C2B-FALLBACK-COMPLETE"
C2B_COMPLETED_ID="$C2B_ID"
request GET "/simulator/transactions/$C2B_COMPLETED_ID"
expect_status 200 "inspect Completed C2B fallback"
expect_json '.status == "SUCCESS" and .callbackAttempts[0].role == "C2B_VALIDATION" and .callbackAttempts[0].ok == false and .callbackAttempts[0].statusCode == 503 and .callbackAttempts[0].responseBody == "Unavailable"' \
  "Completed C2B fallback"
expect_event_count "/c2b/confirmation/completed" 1
expect_event_body "/c2b/confirmation/completed" \
  '.TransactionType == "CustomerPayBillOnline" and .BusinessShortCode == "600002"'

register_c2b "600003" "Cancelled" "/c2b/validation/unavailable" "/c2b/confirmation/cancelled"
simulate_c2b "600003" "LIVE-C2B-FALLBACK-CANCEL"
C2B_CANCELLED_ID="$C2B_ID"
request GET "/simulator/transactions/$C2B_CANCELLED_ID"
expect_status 200 "inspect Cancelled C2B fallback"
expect_json '.status == "FAILED" and (.callbackAttempts | length == 1) and .callbackAttempts[0].role == "C2B_VALIDATION" and .callbackAttempts[0].ok == false and .callbackAttempts[0].statusCode == 503 and .callbackAttempts[0].responseBody == "Unavailable"' \
  "Cancelled C2B fallback"
expect_event_count "/c2b/confirmation/cancelled" 0

B2C_BODY="$(jq -n \
  --arg result "$CALLBACK_BASE/b2c/result" \
  --arg timeout "$CALLBACK_BASE/b2c/timeout" \
  '{
    InitiatorName: "testapi",
    SecurityCredential: "credential",
    CommandID: "BusinessPayment",
    Amount: 1000,
    PartyA: "600000",
    PartyB: "254712345678",
    Remarks: "Live payout",
    QueueTimeOutURL: $timeout,
    ResultURL: $result,
    Occasion: "Harness"
  }')"
request POST "/mpesa/b2c/v1/paymentrequest" "$B2C_BODY" "$BEARER"
expect_status 200 "submit B2C"
B2C_ID="$(jq -er '.ConversationID' "$RESPONSE_FILE")"
request POST "/simulator/payments/$B2C_ID/approve"
expect_status 200 "approve B2C"
expect_json '.status == "SUCCESS" and .callbackAttempts[-1].role == "BUSINESS_RESULT"' "approved B2C"
expect_event_count "/b2c/result" 1
expect_event_body "/b2c/result" \
  '.Result.ResultCode == 0 and (.Result.ResultParameters.ResultParameter | any(.Key == "TransactionAmount" and .Value == 1000))'
request POST "/simulator/payments/$B2C_ID/replay-callback"
expect_status 200 "replay B2C callback"
expect_event_count "/b2c/result" 2

B2B_BODY="$(jq -n \
  --arg result "$CALLBACK_BASE/b2b/result" \
  --arg timeout "$CALLBACK_BASE/b2b/timeout" \
  '{
    Initiator: "testapi",
    SecurityCredential: "credential",
    CommandID: "BusinessPayBill",
    SenderIdentifierType: "4",
    ReceiverIdentifierType: "4",
    Amount: 5000,
    PartyA: "600000",
    PartyB: "600001",
    AccountReference: "LIVE-B2B",
    Remarks: "Live supplier payment",
    QueueTimeOutURL: $timeout,
    ResultURL: $result
  }')"
request POST "/mpesa/b2b/v1/paymentrequest" "$B2B_BODY" "$BEARER"
expect_status 200 "submit B2B"
B2B_ID="$(jq -er '.ConversationID' "$RESPONSE_FILE")"
request POST "/simulator/payments/$B2B_ID/fail"
expect_status 200 "fail B2B"
expect_json '.status == "FAILED" and .callbackAttempts[-1].role == "BUSINESS_RESULT"' "failed B2B"
expect_event_count "/b2b/result" 1
expect_event_body "/b2b/result" \
  '.Result.ResultCode == 1 and (.Result.ResultParameters.ResultParameter | any(.Key == "TransactionAmount" and .Value == 5000))'
expect_event_count "/b2b/timeout" 0

TOPUP_BODY="$(jq -n \
  --arg result "$CALLBACK_BASE/topup/result" \
  --arg timeout "$CALLBACK_BASE/topup/timeout" \
  '{
    InitiatorName: "testapi",
    SecurityCredential: "credential",
    CommandID: "BusinessPayment",
    Amount: 10000,
    PartyA: "600000",
    PartyB: "600001",
    AccountReference: "LIVE-TOPUP",
    Remarks: "Live account top-up",
    QueueTimeOutURL: $timeout,
    ResultURL: $result,
    Occasion: "Harness"
  }')"
request POST "/mpesa/b2caccounttopup/v1/request" "$TOPUP_BODY" "$BEARER"
expect_status 200 "submit experimental account top-up"
TOPUP_ID="$(jq -er '.ConversationID' "$RESPONSE_FILE")"
request POST "/simulator/payments/$TOPUP_ID/timeout"
expect_status 200 "timeout account top-up"
expect_json '.status == "TIMEOUT" and .callbackAttempts[-1].role == "BUSINESS_TIMEOUT"' \
  "timed-out account top-up"
expect_event_count "/topup/timeout" 1
expect_event_body "/topup/timeout" \
  '.Result.ResultCode == 1 and (.Result.ResultDesc | contains("timed out"))'
expect_event_count "/topup/result" 0

B2POCHI_BODY="$(jq -n \
  --arg result "$CALLBACK_BASE/pochi/result" \
  --arg timeout "$CALLBACK_BASE/pochi/timeout" \
  '{
    OriginatorConversationID: "unsupported-pochi",
    InitiatorName: "testapi",
    SecurityCredential: "credential",
    CommandID: "BusinessPayment",
    Amount: 1000,
    PartyA: "600000",
    PartyB: "254712345678",
    Remarks: "Unsupported",
    QueueTimeOutURL: $timeout,
    ResultURL: $result,
    Occasion: "Harness"
  }')"
request POST "/mpesa/b2c/v1/paymentrequest" "$B2POCHI_BODY" "$BEARER"
expect_status 400 "reject unsupported B2Pochi"

request POST "/mpesa/accountbalance/v1/query" '{}' "$BEARER"
expect_status 404 "leave generic account balance unsupported"

request GET "/simulator/transactions"
expect_status 200 "list simulator transactions"
for tracking_id in \
  "$STK_APPROVE_ID" "$STK_FAIL_ID" "$STK_TIMEOUT_ID" \
  "$C2B_ACCEPT_ID" "$C2B_REJECT_ID" "$C2B_COMPLETED_ID" "$C2B_CANCELLED_ID" \
  "$B2C_ID" "$B2B_ID" "$TOPUP_ID"; do
  if ! jq -e --arg id "$tracking_id" 'any(.[]; .trackingId == $id)' "$RESPONSE_FILE" >/dev/null; then
    fail "simulator transaction list is missing $tracking_id"
  fi
done
pass "simulator transaction membership"

echo
echo "Live Daraja Local harness passed."
echo "Base URL: $BASE_URL"
echo "Callbacks received: $(wc -l < "$EVENTS_FILE" | tr -d " ")"
