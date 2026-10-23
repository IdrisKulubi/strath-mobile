import type { dateMatches, datePayments } from "@/db/schema";
import {
    PAYABLE_PAYMENT_STATES,
    type PaymentSessionConflictCode,
    type PayablePaymentState,
} from "@/lib/payments/payment-session-types";

type DateMatchRow = typeof dateMatches.$inferSelect;
type DatePaymentRow = typeof datePayments.$inferSelect;

export type PayabilityAssessment =
    | { eligible: true }
    | { eligible: false; code: PaymentSessionConflictCode; reason: string };

export interface AssessPayabilityInput {
    dateMatch: DateMatchRow;
    userId: string;
    paymentsEnabled: boolean;
    userPayment: DatePaymentRow | null | undefined;
    devForcePayability?: boolean;
    now?: Date;
}

function isParticipant(dateMatch: DateMatchRow, userId: string): boolean {
    return dateMatch.userAId === userId || dateMatch.userBId === userId;
}

function isPayableState(state: string, devForce: boolean): state is PayablePaymentState {
    if (PAYABLE_PAYMENT_STATES.includes(state as PayablePaymentState)) {
        return true;
    }
    return devForce && state === "not_required";
}

export function assessPaymentSessionPayability(input: AssessPayabilityInput): PayabilityAssessment {
    const now = input.now ?? new Date();

    if (!input.paymentsEnabled) {
        return {
            eligible: false,
            code: "payments_disabled",
            reason: "Date setup payments are not enabled",
        };
    }

    if (!isParticipant(input.dateMatch, input.userId)) {
        return {
            eligible: false,
            code: "not_payable",
            reason: "You are not a participant in this date match",
        };
    }

    if (input.userPayment?.status === "paid") {
        return {
            eligible: false,
            code: "already_paid",
            reason: "You have already paid for this date",
        };
    }

    if (input.dateMatch.paymentState === "expired") {
        return {
            eligible: false,
            code: "payment_expired",
            reason: "The payment window for this date has expired",
        };
    }

    if (
        input.dateMatch.paymentDueBy
        && input.dateMatch.paymentDueBy.getTime() <= now.getTime()
    ) {
        return {
            eligible: false,
            code: "payment_expired",
            reason: "The payment window for this date has expired",
        };
    }

    if (!isPayableState(input.dateMatch.paymentState, Boolean(input.devForcePayability))) {
        return {
            eligible: false,
            code: "not_payable",
            reason: "Payment is not required for this date match yet",
        };
    }

    return { eligible: true };
}
