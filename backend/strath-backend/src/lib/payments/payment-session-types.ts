export type PaymentSessionConflictCode =
    | "payments_disabled"
    | "not_payable"
    | "payment_expired"
    | "already_paid";

export type CreatePaymentSessionResult =
    | {
          status: "success";
          authorizationUrl: string;
          reference: string;
      }
    | { status: "not_found" }
    | { status: "forbidden" }
    | {
          status: "conflict";
          code: PaymentSessionConflictCode;
          reason: string;
      };

export const PAYABLE_PAYMENT_STATES = ["awaiting_payment", "paid_waiting_for_other"] as const;

export type PayablePaymentState = (typeof PAYABLE_PAYMENT_STATES)[number];

export const DATE_MATCH_PAYMENT_STATES = [
    "not_required",
    "awaiting_payment",
    "paid_waiting_for_other",
    "both_paid",
    "expired",
    "cancelled",
] as const;

export type DateMatchPaymentState = (typeof DATE_MATCH_PAYMENT_STATES)[number];
