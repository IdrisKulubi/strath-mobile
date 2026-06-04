export type PaymentStatusResult =
    | { status: "not_found" }
    | { status: "forbidden" }
    | {
          status: "ok";
          dateMatchId: string;
          paymentState: string;
          currentUserPaid: boolean;
          otherUserPaid: boolean;
          amount: number;
          currency: string;
          paymentDueBy: string | null;
      };
