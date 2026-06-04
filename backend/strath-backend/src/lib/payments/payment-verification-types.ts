export type PaymentVerificationSource = "verify" | "webhook";

export type MarkPaymentPaidResult =
    | {
          status: "success";
          dateMatchId: string;
          userId: string;
          paymentState: string;
          currentUserPaid: true;
          otherUserPaid: boolean;
          finalized: boolean;
          alreadyProcessed: boolean;
      }
    | { status: "not_found" }
    | { status: "verification_failed"; reason: string };
