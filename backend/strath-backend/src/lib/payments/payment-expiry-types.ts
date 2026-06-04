export const PAYMENT_EXPIRABLE_STATES = ["awaiting_payment", "paid_waiting_for_other"] as const;

export type PaymentExpirableState = (typeof PAYMENT_EXPIRABLE_STATES)[number];

export type ExpirePaymentMatchResult =
    | {
          status: "expired";
          dateMatchId: string;
          credited: boolean;
          lowIntentIncremented: boolean;
      }
    | { status: "skipped"; dateMatchId: string; reason: string };

export type PaymentExpirySweepResult = {
    scanned: number;
    expired: number;
    credited: number;
    lowIntentIncremented: number;
    skipped: number;
};
