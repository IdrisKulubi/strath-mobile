import { eq } from "drizzle-orm";

import { profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { APP_FEATURE_KEYS, isFeatureEnabled } from "@/lib/feature-flags";
import { getPaymentConfig } from "@/lib/payments/config";
import { assessPaymentSessionPayability } from "@/lib/payments/payment-payability";
import {
    findDateMatchById,
    findUserPaymentForMatch,
} from "@/lib/payments/payment-repository";
import { verifyPaymentToken } from "@/lib/payments/payment-token";
import { formatMeetupSlotForDisplay } from "@/lib/services/meetup-slot-service";

export type PaymentCheckoutContextResult =
    | { status: "invalid" }
    | {
          status: "ok";
          dateMatchId: string;
          amount: number;
          currency: string;
          partnerFirstName: string;
          scheduledAtLabel: string | null;
          paymentState: string;
          currentUserPaid: boolean;
          canPay: boolean;
          blockReason: string | null;
      };

export async function getPaymentCheckoutContext(
    paymentToken: string,
): Promise<PaymentCheckoutContextResult> {
    const payload = verifyPaymentToken(paymentToken);
    if (!payload) {
        return { status: "invalid" };
    }

    const dateMatch = await findDateMatchById(payload.dateMatchId);
    if (!dateMatch) {
        return { status: "invalid" };
    }

    const partnerId =
        dateMatch.userAId === payload.userId ? dateMatch.userBId : dateMatch.userAId;

    const [partnerProfile, userPayment, paymentsEnabled] = await Promise.all([
        db.query.profiles.findFirst({
            where: eq(profiles.userId, partnerId),
            columns: { firstName: true },
        }),
        findUserPaymentForMatch(payload.dateMatchId, payload.userId),
        isFeatureEnabled(APP_FEATURE_KEYS.paymentsEnabled, false),
    ]);

    const payability = assessPaymentSessionPayability({
        dateMatch,
        userId: payload.userId,
        paymentsEnabled,
        userPayment,
        devForcePayability: process.env.NODE_ENV === "development",
    });

    const { amountCents, currency } = getPaymentConfig();
    const currentUserPaid = userPayment?.status === "paid";

    return {
        status: "ok",
        dateMatchId: payload.dateMatchId,
        amount: amountCents / 100,
        currency,
        partnerFirstName: partnerProfile?.firstName?.trim() || "your match",
        scheduledAtLabel: dateMatch.scheduledAt
            ? formatMeetupSlotForDisplay(dateMatch.scheduledAt)
            : null,
        paymentState: dateMatch.paymentState,
        currentUserPaid,
        canPay: payability.eligible,
        blockReason: payability.eligible ? null : payability.reason,
    };
}
