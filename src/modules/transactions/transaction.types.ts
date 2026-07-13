export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "TIMEOUT";
export type TransactionKind = "STK" | "C2B" | "B2C" | "B2B" | "B2C_ACCOUNT_TOPUP";

export type StkRequestPayload = {
  BusinessShortCode: number;
  Password: string;
  Timestamp: string;
  TransactionType: string;
  Amount: number;
  PartyA: number;
  PartyB: number;
  PhoneNumber: number;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
};
export type CallbackRole =
  | "STK_RESULT"
  | "C2B_VALIDATION"
  | "C2B_CONFIRMATION"
  | "BUSINESS_RESULT"
  | "BUSINESS_TIMEOUT";

export type CallbackAttempt = {
  id: string;
  url: string;
  role: CallbackRole;
  sentAt: string;
  statusCode?: number;
  ok: boolean;
  error?: string;
  payload: unknown;
  responseBody?: unknown;
};

export type Transaction = {
  id: string;
  kind: TransactionKind;
  trackingId: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  conversationId?: string;
  originatorConversationId?: string;
  status: TransactionStatus;
  amount: number;
  phoneNumber?: string;
  accountReference?: string;
  senderParty?: string;
  receiverParty?: string;
  commandId?: string;
  callbackUrl?: string;
  resultUrl?: string;
  queueTimeoutUrl?: string;
  rawRequest: unknown;
  createdAt: string;
  updatedAt: string;
  resultCode?: number | string;
  resultDesc?: string;
  callbackAttempts: CallbackAttempt[];
};

export type StkTransaction = Transaction & {
  kind: "STK";
  merchantRequestId: string;
  checkoutRequestId: string;
};

export type TransactionRepository = {
  create(transaction: Transaction): Promise<Transaction>;
  transition(
    trackingId: string,
    expectedStatus: TransactionStatus,
    changes: Pick<Transaction, "status" | "resultCode" | "resultDesc" | "updatedAt">
  ): Promise<Transaction | undefined>;
  appendCallbackAttempt(
    trackingId: string,
    attempt: CallbackAttempt,
    updatedAt: string
  ): Promise<Transaction | undefined>;
  findById(id: string): Promise<Transaction | undefined>;
  findByCheckoutRequestId(checkoutRequestId: string): Promise<Transaction | undefined>;
  findByTrackingId(trackingId: string): Promise<Transaction | undefined>;
  list(): Promise<Transaction[]>;
};
