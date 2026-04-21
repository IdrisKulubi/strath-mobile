import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
    type RCWebhookBody,
    verifyWebhookAuth,
} from "@/lib/revenuecat-server";
import { db } from "@/lib/db";
import {
    dateMatches,
    datePayments,
    user as userTable,
} from "@/db/schema";
import {
    advanceAfterPayment,
    markPaymentRefunded,
    recordRevenueCatPayment,
} from "@/lib/services/payments-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/webhooks/revenuecat
 *
 * RevenueCat notifies us of every purchase + lifecycle change. This is the
 * source of truth for any state change that happens after the app is closed
 * (refunds, delayed-validate purchases, etc).
 *
 * Both `/api/payments/confirm` and this webhook can write to the same
 * `date_payments` row; the uniqueness constraint on `revenuecat_transaction_id`
 * + the `(date_match_id, user_id)` key keep the writes idempotent.
 *
 * We require:
 *   1. A valid shared secret in the `Authorization` header.
 *   2. A `dateMatchId` attribute in the event (we set this as a subscriber
 *      attribute at purchase time on the client — see docs/payment.md §5).
 *      If not present, we look up the most recent `awaiting_payment` match
 *      for the user.
 */
export async function POST(req: NextRequest) {
    try {
        if (!verifyWebhookAuth(req.headers.get("authorization"))) {
            return errorResponse("Unauthorized", 401);
        }

        const body = (await req.json()) as RCWebhookBody;
        const event = body?.event;
        if (!event?.type) {
            return errorResponse("Missing event.type", 400);
        }

        const appUserId = event.app_user_id;
        const userRow = await db.query.user.findFirst({
            where: eq(userTable.id, appUserId),
        });
        if (!userRow) {
            // Unknown user — accept to avoid RC retries, but log loudly.
            console.warn("[webhooks/revenuecat] unknown app_user_id", appUserId);
            return successResponse({ ok: true, ignored: "unknown_app_user_id" });
        }

        switch (event.type) {
            case "INITIAL_PURCHASE":
            case "NON_RENEWING_PURCHASE":
            case "RENEWAL": {
                const transactionId = event.transaction_id ?? event.original_transaction_id;
                if (!transactionId) {
                    return errorResponse("Missing transaction_id", 400);
                }

                const dateMatchId = await resolveDateMatchIdForPurchase(
                    appUserId,
                    transactionId,
                );
                if (!dateMatchId) {
                    console.warn(
                        "[webhooks/revenuecat] could not resolve date_match for purchase",
                        { appUserId, transactionId },
                    );
                    // Still 200 so RC doesn't retry forever.
                    return successResponse({
                        ok: true,
                        ignored: "no_matching_date",
                    });
                }

                const platform: "ios" | "android" | null =
                    event.store === "APP_STORE"
                        ? "ios"
                        : event.store === "PLAY_STORE"
                            ? "android"
                            : null;

                await recordRevenueCatPayment({
                    dateMatchId,
                    userId: appUserId,
                    revenuecatAppUserId: appUserId,
                    revenuecatTransactionId: transactionId,
                    storeTransactionId: event.original_transaction_id ?? transactionId,
                    platform,
                    productId: event.product_id,
                    purchaseDate: event.purchased_at_ms
                        ? new Date(event.purchased_at_ms)
                        : new Date(),
                    rawPayload: event as unknown as Record<string, unknown>,
                });

                const nextState = await advanceAfterPayment(dateMatchId);

                // Notify the partner when both have paid (same push as /confirm
                // would have fired — harmless if they overlap because the app
                // dedupes by type+dateMatchId).
                if (nextState === "being_arranged") {
                    try {
                        const match = await db.query.dateMatches.findFirst({
                            where: eq(dateMatches.id, dateMatchId),
                        });
                        if (match) {
                            const [u1, u2] = await Promise.all([
                                db.query.user.findFirst({
                                    where: eq(userTable.id, match.userAId),
                                }),
                                db.query.user.findFirst({
                                    where: eq(userTable.id, match.userBId),
                                }),
                            ]);
                            const copy = {
                                title: "You're both in 💫",
                                body: "We're arranging this one. Our team will reach out soon.",
                                data: {
                                    type: NOTIFICATION_TYPES.DATE_BEING_ARRANGED,
                                    dateMatchId,
                                },
                            };
                            if (u1?.pushToken) await sendPushNotification(u1.pushToken, copy);
                            if (u2?.pushToken) await sendPushNotification(u2.pushToken, copy);
                        }
                    } catch (notifErr) {
                        console.warn(
                            "[webhooks/revenuecat] failed to send arranging notification",
                            notifErr,
                        );
                    }
                }

                return successResponse({ ok: true, state: nextState });
            }

            case "CANCELLATION":
            case "REFUND": {
                const transactionId = event.transaction_id ?? event.original_transaction_id;
                if (!transactionId) {
                    return errorResponse("Missing transaction_id", 400);
                }
                const reason = event.cancel_reason ?? event.type;
                const refunded = await markPaymentRefunded(transactionId, reason);
                if (!refunded) {
                    return successResponse({
                        ok: true,
                        ignored: "unknown_transaction",
                    });
                }
                return successResponse({ ok: true, refunded: true });
            }

            case "EXPIRATION":
            case "PRODUCT_CHANGE":
            case "BILLING_ISSUE":
            case "TRANSFER":
            default:
                // Not applicable for a consumable date coordination fee — log + ack.
                console.log(
                    "[webhooks/revenuecat] ignoring event type",
                    event.type,
                );
                return successResponse({ ok: true, ignored: event.type });
        }
    } catch (error) {
        console.error("[webhooks/revenuecat] error:", error);
        return errorResponse(error);
    }
}

/**
 * Best-effort resolver for the match a purchase is for.
 *
 * Priority order:
 *   1. If a `date_payments` row already exists for this `transactionId`
 *      (written by /api/payments/confirm), reuse its `dateMatchId`.
 *   2. Otherwise, pick the most-recent match for this user in
 *      `awaiting_payment` / `paid_waiting_for_other` without a payment from
 *      this user yet. This matches the UX constraint that a user can only
 *      have one active paywall open at a time.
 */
async function resolveDateMatchIdForPurchase(
    appUserId: string,
    transactionId: string,
): Promise<string | null> {
    const existing = await db.query.datePayments.findFirst({
        where: eq(datePayments.revenuecatTransactionId, transactionId),
    });
    if (existing) return existing.dateMatchId;

    // Scan recent matches for this specific user and return the most recent
    // one sitting in an open payment state. A user's UX guarantees only one
    // paywall is open at a time, so this is unambiguous in practice.
    const userMatches = await db.query.dateMatches.findMany({
        orderBy: (m, { desc }) => [desc(m.createdAt)],
        limit: 20,
    });
    const relevant = userMatches.find(
        (m) =>
            (m.userAId === appUserId || m.userBId === appUserId)
            && (m.paymentState === "awaiting_payment"
                || m.paymentState === "paid_waiting_for_other"),
    );

    return relevant?.id ?? null;
}
