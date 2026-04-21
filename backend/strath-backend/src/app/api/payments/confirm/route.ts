import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { isPaymentsEnabled } from "@/lib/feature-flags";
import {
    PurchaseVerificationError,
    verifyTransaction,
} from "@/lib/revenuecat-server";
import {
    advanceAfterPayment,
    loadDateMatchSnapshot,
    recordRevenueCatPayment,
} from "@/lib/services/payments-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { user as userTable } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const confirmSchema = z.object({
    dateMatchId: z.string().uuid(),
    transactionIdentifier: z.string().min(1),
    productIdentifier: z.string().min(1),
    rcAppUserId: z.string().min(1),
    platform: z.enum(["ios", "android"]),
    purchaseDate: z.string().min(1),
    purchaseToken: z.string().nullable().optional(),
});

/**
 * POST /api/payments/confirm
 *
 * Client-side receipt confirmation. The mobile app calls this after
 * `Purchases.purchasePackage()` returns success. We never trust the payload —
 * we hit RevenueCat's REST API to re-verify the transaction exists on that
 * subscriber and matches our configured product id before writing anything.
 *
 * Idempotent on `(date_match_id, user_id)` — safe to retry.
 * See docs/payment.md §8 for the verification sequence.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        if (!(await isPaymentsEnabled())) {
            return errorResponse("payments_disabled", 400);
        }

        const body = confirmSchema.parse(await req.json());

        if (body.rcAppUserId !== userId) {
            // The RC app-user-id must mirror our internal user.id. Any mismatch
            // means the client is trying to confirm someone else's purchase.
            return errorResponse("rcAppUserId mismatch", 403);
        }

        const snapshot = await loadDateMatchSnapshot(body.dateMatchId);
        if (!snapshot) return errorResponse("Date match not found", 404);
        if (snapshot.userAId !== userId && snapshot.userBId !== userId) {
            return errorResponse("Forbidden", 403);
        }
        if (
            snapshot.paymentState !== "awaiting_payment"
            && snapshot.paymentState !== "paid_waiting_for_other"
        ) {
            // Still honor the purchase if we can — match may have advanced via
            // webhook. Only reject if the match is already past the payment gate.
            if (
                snapshot.paymentState === "being_arranged"
                || snapshot.paymentState === "confirmed"
            ) {
                return successResponse({
                    ok: true,
                    state: snapshot.paymentState,
                    partnerPaid: true,
                });
            }
            return errorResponse(
                `Cannot confirm payment while match is '${snapshot.paymentState}'`,
                409,
            );
        }

        let verified;
        try {
            verified = await verifyTransaction(
                body.rcAppUserId,
                body.transactionIdentifier,
                { maxAgeMinutes: 30 },
            );
        } catch (error) {
            if (error instanceof PurchaseVerificationError) {
                console.warn("[api/payments/confirm] verification failed:", {
                    code: error.code,
                    userId,
                    dateMatchId: body.dateMatchId,
                });
                return errorResponse(error.message, 402);
            }
            throw error;
        }

        if (verified.productId !== body.productIdentifier) {
            return errorResponse("Product mismatch", 402);
        }

        await recordRevenueCatPayment({
            dateMatchId: body.dateMatchId,
            userId,
            revenuecatAppUserId: body.rcAppUserId,
            revenuecatTransactionId: verified.revenuecatTransactionId,
            storeTransactionId: verified.storeTransactionId,
            platform: verified.platform,
            productId: verified.productId,
            purchaseDate: verified.purchaseDate,
        });

        const nextState = await advanceAfterPayment(body.dateMatchId);

        // Fire partner notifications (best-effort — never fail the request).
        const partnerId = snapshot.userAId === userId ? snapshot.userBId : snapshot.userAId;
        try {
            const [me, partner] = await Promise.all([
                db.query.user.findFirst({ where: eq(userTable.id, userId) }),
                db.query.user.findFirst({ where: eq(userTable.id, partnerId) }),
            ]);
            const myName = me?.name?.split(" ")[0] ?? "Someone";

            if (nextState === "being_arranged") {
                const copy = {
                    title: "You're both in 💫",
                    body: "We're arranging this one. Our team will reach out soon.",
                    data: {
                        type: NOTIFICATION_TYPES.DATE_BEING_ARRANGED,
                        dateMatchId: body.dateMatchId,
                    },
                };
                if (me?.pushToken) await sendPushNotification(me.pushToken, copy);
                if (partner?.pushToken) {
                    await sendPushNotification(partner.pushToken, copy);
                }
            } else if (nextState === "paid_waiting_for_other" && partner?.pushToken) {
                await sendPushNotification(partner.pushToken, {
                    title: `${myName} paid 💳`,
                    body: "Your turn — 24h to confirm the date.",
                    data: {
                        type: NOTIFICATION_TYPES.PARTNER_PAID,
                        dateMatchId: body.dateMatchId,
                    },
                });
            }
        } catch (notifErr) {
            console.warn("[api/payments/confirm] notifications failed:", notifErr);
        }

        return successResponse({
            ok: true,
            state: nextState,
            partnerPaid: nextState === "being_arranged",
        });
    } catch (error) {
        console.error("[api/payments/confirm] error:", error);
        return errorResponse(error);
    }
}
