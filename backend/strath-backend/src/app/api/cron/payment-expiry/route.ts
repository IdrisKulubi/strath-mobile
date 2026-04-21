import { NextRequest } from "next/server";
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { dateMatches, mutualMatches, user as userTable } from "@/db/schema";
import { isAuthorizedCronRequest } from "@/lib/security";
import {
    getExpectedPriceCents,
    getPaymentWindowHours,
} from "@/lib/revenuecat-server";
import {
    grantPartnerDidNotPayCredit,
    loadDateMatchSnapshot,
} from "@/lib/services/payments-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/payment-expiry
 *
 * Runs every 15 minutes (`vercel.json`). For each `date_matches` row whose
 * `payment_due_by` has passed and is still in `awaiting_payment` or
 * `paid_waiting_for_other`:
 *
 *   - `awaiting_payment` (nobody paid) → cancel the match, mark `expired`.
 *   - `paid_waiting_for_other`         → credit the payer KES 200, cancel
 *                                        the match, mark `expired`.
 *
 * Fires `PAYMENT_EXPIRED` pushes to both users, and `CREDIT_GRANTED` to the
 * paying user when applicable. See docs/payment.md §6.
 *
 * No-op when the `payments_enabled` flag is OFF because no rows ever enter
 * a gated state — the cron is always safe to leave running.
 */
export async function GET(req: NextRequest) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const now = new Date();

        const expired = await db
            .select()
            .from(dateMatches)
            .where(
                and(
                    inArray(dateMatches.paymentState, [
                        "awaiting_payment",
                        "paid_waiting_for_other",
                    ]),
                    isNotNull(dateMatches.paymentDueBy),
                    lt(dateMatches.paymentDueBy, now),
                ),
            );

        let cancelled = 0;
        let creditsGranted = 0;

        for (const row of expired) {
            const snapshot = await loadDateMatchSnapshot(row.id);
            if (!snapshot) continue;

            const aPaid = !!snapshot.paidByUser[snapshot.userAId];
            const bPaid = !!snapshot.paidByUser[snapshot.userBId];
            const payerId = aPaid && !bPaid
                ? snapshot.userAId
                : bPaid && !aPaid
                    ? snapshot.userBId
                    : null;

            // If one side paid, grant them a credit equal to what they spent.
            if (payerId) {
                await grantPartnerDidNotPayCredit({
                    userId: payerId,
                    dateMatchId: row.id,
                    amountCents: getExpectedPriceCents(),
                });
                creditsGranted++;
            }

            // Cancel the match. `status = cancelled` keeps the existing admin
            // history views unchanged; `paymentState = expired` signals why.
            await db
                .update(dateMatches)
                .set({
                    status: "cancelled",
                    paymentState: "expired",
                })
                .where(eq(dateMatches.id, row.id));

            // Mirror to mutualMatches so the mobile client drops the pair off
            // the active list.
            await db
                .update(mutualMatches)
                .set({ status: "expired", updatedAt: now })
                .where(eq(mutualMatches.legacyDateMatchId, row.id));

            cancelled++;

            // Fire notifications (best-effort).
            try {
                const [uA, uB] = await Promise.all([
                    db.query.user.findFirst({ where: eq(userTable.id, row.userAId) }),
                    db.query.user.findFirst({ where: eq(userTable.id, row.userBId) }),
                ]);

                const expiredPush = {
                    title: "Date didn't get confirmed",
                    body: "Your window to confirm the date has passed. We've moved on.",
                    data: {
                        type: NOTIFICATION_TYPES.PAYMENT_EXPIRED,
                        dateMatchId: row.id,
                    },
                };
                if (uA?.pushToken) await sendPushNotification(uA.pushToken, expiredPush);
                if (uB?.pushToken) await sendPushNotification(uB.pushToken, expiredPush);

                if (payerId) {
                    const payer = payerId === row.userAId ? uA : uB;
                    if (payer?.pushToken) {
                        await sendPushNotification(payer.pushToken, {
                            title: "Credited KES 200 💙",
                            body: "Your partner didn't confirm in time. Use your credit on your next date.",
                            data: {
                                type: NOTIFICATION_TYPES.CREDIT_GRANTED,
                                dateMatchId: row.id,
                            },
                        });
                    }
                }
            } catch (notifErr) {
                console.warn(
                    "[cron/payment-expiry] notification failed",
                    notifErr,
                );
            }
        }

        const result = {
            ok: true,
            scanned: expired.length,
            cancelled,
            creditsGranted,
            windowHours: getPaymentWindowHours(),
            now: now.toISOString(),
        };
        console.log("[cron/payment-expiry] done", result);
        return successResponse(result);
    } catch (error) {
        console.error("[cron/payment-expiry] error:", error);
        return errorResponse(error);
    }
}
