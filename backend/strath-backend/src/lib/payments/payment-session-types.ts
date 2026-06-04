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
