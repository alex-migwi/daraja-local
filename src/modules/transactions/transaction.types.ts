export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "TIMEOUT";
export type TransactionKind = "STK" | "C2B" | "B2C" | "B2B" | "B2C_ACCOUNT_TOPUP";

export const TransactionValidationErrorCode = ["C2B00011" , "C2B00012" , "C2B00013" , "C2B00014" , "C2B00015" , "C2B00016"];

export type StkRequestPayload = {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: string;
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
};


export type CallbackAttempt = {
  id: string;
  sentAt: string;
  statusCode?: number;
  ok: boolean;
  error?: string;
  payload: unknown;
};

export type Transaction = {
  id: string;
  kind: TransactionKind;
  trackingId: string;
  merchantRequestId: string;
  checkoutRequestId: string;
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
  resultCode?: number;
  resultDesc?: string;
  callbackAttempts: CallbackAttempt[];
};

export type TransactionRepository = {
  create(transaction: Transaction): Promise<Transaction>;
  update(transaction: Transaction): Promise<Transaction>;
  findById(id: string): Promise<Transaction | undefined>;
  findByCheckoutRequestId(checkoutRequestId: string): Promise<Transaction | undefined>;
  findByTrackingId(trackingId: string): Promise<Transaction | undefined>;
  list(): Promise<Transaction[]>;
};
