export function validStkRequest(overrides: Record<string, unknown> = {}) {
  return {
    BusinessShortCode: "174379",
    Password: "password",
    Timestamp: "20260603101010",
    TransactionType: "CustomerPayBillOnline",
    Amount: 100,
    PartyA: "254712345678",
    PartyB: "174379",
    PhoneNumber: "254712345678",
    CallBackURL: "http://127.0.0.1:65530/callback",
    AccountReference: "INV-001",
    TransactionDesc: "Test payment",
    ...overrides
  };
}
