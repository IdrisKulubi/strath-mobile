import { APP_FEATURE_KEYS, isFeatureEnabled } from "@/lib/feature-flags";
import { resolvePaymentActor } from "@/lib/payments/payment-auth";
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
    userId?: string;
    paymentToken?: string;
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
    const actor = resolvePaymentActor({
        sessionUserId: input.userId,
        paymentToken: input.paymentToken,
        dateMatchId: input.dateMatchId,
    });

    if (!actor) {
        return { status: "forbidden" };
    }

    const userId = actor.userId;
    const paymentsEnabled = await isFeatureEnabled(APP_FEATURE_KEYS.paymentsEnabled, false);

    const dateMatch = await findDateMatchById(input.dateMatchId);
    if (!dateMatch) {
        return { status: "not_found" };
    }

    const userPayment = await findUserPaymentForMatch(input.dateMatchId, userId);

    const payability = assessPaymentSessionPayability({
        dateMatch,
        userId,
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

    const email = await findUserEmail(userId);
    if (!email) {
        return {
            status: "conflict",
            code: "not_payable",
            reason: "A valid email is required to start payment",
        };
    }

    const { reference } = await ensurePendingPaystackPayment({
        dateMatchId: input.dateMatchId,
        userId,
    });

    const paystack = await initializeTransaction({
        email,
        reference,
        callbackUrl: buildCallbackUrl(),
        dateMatchId: input.dateMatchId,
        userId,
    });

    return {
        status: "success",
        authorizationUrl: paystack.authorizationUrl,
        reference: paystack.reference,
    };
}
