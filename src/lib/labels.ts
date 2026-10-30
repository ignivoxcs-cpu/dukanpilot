import type { PaymentMethod } from "./types";

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: "UPI",
  cash: "Cash",
  bank_transfer: "Bank transfer",
  card: "Card",
  other: "Other",
};
