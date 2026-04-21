import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { isPaymentsEnabled } from "@/lib/feature-flags";
import {
    getUserCreditBalanceCents,
    loadDateMatchSnapshot,
    redeemCreditForDate,
} from "@/lib/services/payments-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";

export const dynamic = "force-dynamic";

const schema = z.object({
    dateMatchId: z.string().uuid(),
});

/**
 * POST /api/payments/use-credit
 *
 * Spend an existing StrathSpace credit instead of paying cash. Writes a
 * `date_payments` row with `provider='credit', status='credited'` and a
 * negative `user_credits` row to deduct the balance.
 *
 * Idempotent — repeated calls for the same user + match return the existing
 * credit-payment row and the current state.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        if (!(await isPaymentsEnabled())) {
            return errorResponse("payments_disabled", 400);
        }

        const { dateMatchId } = schema.parse(await req.json());

        const snapshot = await loadDateMatchSnapshot(dateMatchId);
        if (!snapshot) return errorResponse("Date match not found", 404);
        if (snapshot.userAId !== userId && snapshot.userBId !== userId) {
            return errorResponse("Forbidden", 403);
        }

        const result = await redeemCreditForDate({ dateMatchId, userId });
        if (!result.ok) {
            const code =
                result.reason === "insufficient_credit"
                    ? 402
                    : result.reason === "match_not_found"
                        ? 404
                        : 409;
            return errorResponse(result.reason, code);
        }

        const creditBalanceCents = await getUserCreditBalanceCents(userId);

        // Notify partner if this finishes the pair, mirroring /confirm.
        try {
            const partnerId = snapshot.userAId === userId ? snapshot.userBId : snapshot.userAId;
            const [me, partner] = await Promise.all([
                db.query.user.findFirst({ where: eq(userTable.id, userId) }),
                db.query.user.findFirst({ where: eq(userTable.id, partnerId) }),
            ]);
            const myName = me?.name?.split(" ")[0] ?? "Someone";

            if (result.paymentState === "being_arranged") {
                const copy = {
                    title: "You're both in 💫",
                    body: "We're arranging this one. Our team will reach out soon.",
                    data: {
                        type: NOTIFICATION_TYPES.DATE_BEING_ARRANGED,
                        dateMatchId,
                    },
                };
                if (me?.pushToken) await sendPushNotification(me.pushToken, copy);
                if (partner?.pushToken) await sendPushNotification(partner.pushToken, copy);
            } else if (
                result.paymentState === "paid_waiting_for_other"
                && partner?.pushToken
            ) {
                await sendPushNotification(partner.pushToken, {
                    title: `${myName} is confirmed ✨`,
                    body: "Your turn — 24h to confirm the date.",
                    data: {
                        type: NOTIFICATION_TYPES.PARTNER_PAID,
                        dateMatchId,
                    },
                });
            }
        } catch (notifErr) {
            console.warn("[api/payments/use-credit] notifications failed:", notifErr);
        }

        return successResponse({
            ok: true,
            state: result.paymentState,
            partnerPaid: result.paymentState === "being_arranged",
            creditBalanceCents,
        });
    } catch (error) {
        console.error("[api/payments/use-credit] error:", error);
        return errorResponse(error);
    }
}
