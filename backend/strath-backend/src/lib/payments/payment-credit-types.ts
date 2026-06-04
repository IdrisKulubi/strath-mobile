export type PaymentCreditConflictCode =
    | "already_paid"
    | "insufficient_credit"
    | "not_eligible"
    | "payment_expired"
    | "not_found"
    | "forbidden"
    | "cannot_refund";

export type SpendCreditResult =
    | {
          status: "success";
          dateMatchId: string;
          paymentState: string;
          currentUserPaid: true;
          otherUserPaid: boolean;
          finalized: boolean;
          alreadyProcessed: boolean;
      }
    | { status: "not_found" }
    | { status: "forbidden" }
    | {
          status: "conflict";
          code: PaymentCreditConflictCode;
          reason: string;
      };

export type RefundChoice = "credit" | "refund";

export type RefundChoiceResult =
    | {
          status: "success";
          choice: RefundChoice;
          paymentStatus: string;
          creditKept: boolean;
      }
    | { status: "not_found" }
    | { status: "forbidden" }
    | {
          status: "conflict";
          code: PaymentCreditConflictCode;
          reason: string;
      };
