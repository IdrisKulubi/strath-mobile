import { APP_FEATURE_KEYS, isFeatureEnabled } from "@/lib/feature-flags";
import { assertPaymentEnv, getPaymentConfig } from "@/lib/payments/config";
import { initializeTransaction } from "@/lib/payments/paystack-client";
import { assessPaymentSessionPayability } from "@/lib/payments/payment-payability";
import {
    ensurePendingPaystackPayment,
    findDateMatchById,
    findUserEmail,
    findUserPaymentForMatch,
} from "@/lib/payments/payment-repository";
import type { CreatePaymentSessionResult } from "@/lib/payments/payment-session-types";

export interface CreatePaymentSessionInput {
    dateMatchId: string;
    userId: string;
    /** Dev-only: allow paying when payment_state is still not_required */
    devForcePayability?: boolean;
}

function buildCallbackUrl(): string {
    const base = getPaymentConfig().webPaymentUrl.replace(/\/$/, "");
    return `${base}/callback`;
}

export async function createPaymentSession(
    input: CreatePaymentSessionInput,
): Promise<CreatePaymentSessionResult> {
    const paymentsEnabled = await isFeatureEnabled(APP_FEATURE_KEYS.paymentsEnabled, false);

    const dateMatch = await findDateMatchById(input.dateMatchId);
    if (!dateMatch) {
        return { status: "not_found" };
    }

    const isParticipant =
        dateMatch.userAId === input.userId || dateMatch.userBId === input.userId;
    if (!isParticipant) {
        return { status: "forbidden" };
    }

    const userPayment = await findUserPaymentForMatch(input.dateMatchId, input.userId);

    const payability = assessPaymentSessionPayability({
        dateMatch,
        userId: input.userId,
        paymentsEnabled,
        userPayment,
        devForcePayability: input.devForcePayability,
    });

    if (!payability.eligible) {
        return {
            status: "conflict",
            code: payability.code,
            reason: payability.reason,
        };
    }

    assertPaymentEnv();

    const email = await findUserEmail(input.userId);
    if (!email) {
        return {
            status: "conflict",
            code: "not_payable",
            reason: "A valid email is required to start payment",
        };
    }

    const { reference } = await ensurePendingPaystackPayment({
        dateMatchId: input.dateMatchId,
        userId: input.userId,
    });

    const paystack = await initializeTransaction({
        email,
        reference,
        callbackUrl: buildCallbackUrl(),
        dateMatchId: input.dateMatchId,
        userId: input.userId,
    });

    return {
        status: "success",
        authorizationUrl: paystack.authorizationUrl,
        reference: paystack.reference,
    };
}
