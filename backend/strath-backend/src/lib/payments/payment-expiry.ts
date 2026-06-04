import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { dateMatches, datePayments, mutualMatches, user, userCredits } from "@/db/schema";
import { getPaymentConfig } from "@/lib/payments/config";
import {
    PAYMENT_EXPIRABLE_STATES,
    type ExpirePaymentMatchResult,
    type PaymentExpirySweepResult,
} from "@/lib/payments/payment-expiry-types";
import { notifyPaymentMatchExpired } from "@/lib/services/payment-push-notifications-service";

const CREDIT_REASON = "partner_did_not_pay";

export function isPaymentDueExpired(
    paymentDueBy: Date | null | undefined,
    now: Date = new Date(),
): boolean {
    if (!paymentDueBy) return false;
    return paymentDueBy.getTime() < now.getTime();
}

export function findSinglePaidPayer(
    payments: Array<{ userId: string; status: string }>,
): { payerUserId: string } | null {
    const paid = payments.filter((p) => p.status === "paid");
    if (paid.length !== 1) return null;
    return { payerUserId: paid[0]!.userId };
}

export async function findPaymentExpiredDateMatchIds(now: Date = new Date()): Promise<string[]> {
    const rows = await db
        .select({ id: dateMatches.id })
        .from(dateMatches)
        .where(
            and(
                inArray(dateMatches.paymentState, [...PAYMENT_EXPIRABLE_STATES]),
                isNotNull(dateMatches.paymentDueBy),
                lt(dateMatches.paymentDueBy, now),
            ),
        );

    return rows.map((r) => r.id);
}

export async function expirePaymentMatch(dateMatchId: string): Promise<ExpirePaymentMatchResult> {
    const now = new Date();

    return db.transaction(async (tx) => {
        const match = await tx.query.dateMatches.findFirst({
            where: eq(dateMatches.id, dateMatchId),
        });

        if (!match) {
            return { status: "skipped", dateMatchId, reason: "not_found" };
        }

        if (!PAYMENT_EXPIRABLE_STATES.includes(match.paymentState as (typeof PAYMENT_EXPIRABLE_STATES)[number])) {
            return { status: "skipped", dateMatchId, reason: "already_processed" };
        }

        if (!isPaymentDueExpired(match.paymentDueBy, now)) {
            return { status: "skipped", dateMatchId, reason: "not_due" };
        }

        const payments = await tx.query.datePayments.findMany({
            where: eq(datePayments.dateMatchId, dateMatchId),
        });

        let credited = false;
        let lowIntentIncremented = false;
        let payerUserId: string | null = null;

        const singlePayer = findSinglePaidPayer(payments);
        if (singlePayer) {
            const payerPayment = payments.find(
                (p) => p.userId === singlePayer.payerUserId && p.status === "paid",
            );

            if (payerPayment) {
                const existingCredit = await tx.query.userCredits.findFirst({
                    where: eq(userCredits.paymentId, payerPayment.id),
                });

                if (!existingCredit) {
                    const { amountCents, currency } = getPaymentConfig();
                    const amount = payerPayment.amountCents ?? amountCents;

                    await tx.insert(userCredits).values({
                        userId: payerPayment.userId,
                        amountCents: amount,
                        currency: payerPayment.currency ?? currency,
                        reason: CREDIT_REASON,
                        dateMatchId,
                        paymentId: payerPayment.id,
                        status: "active",
                        createdAt: now,
                    });

                    await tx
                        .update(datePayments)
                        .set({
                            status: "credited",
                            creditedAt: now,
                            updatedAt: now,
                        })
                        .where(eq(datePayments.id, payerPayment.id));

                    credited = true;
                    payerUserId = payerPayment.userId;

                    const nonPayerId =
                        match.userAId === payerPayment.userId
                            ? match.userBId
                            : match.userAId;

                    await tx
                        .update(user)
                        .set({
                            lowIntentScore: sql`${user.lowIntentScore} + 1`,
                            updatedAt: now,
                        })
                        .where(eq(user.id, nonPayerId));

                    lowIntentIncremented = true;
                }
            }
        }

        await tx
            .update(dateMatches)
            .set({
                paymentState: "expired",
                status: "cancelled",
            })
            .where(eq(dateMatches.id, dateMatchId));

        await tx
            .update(mutualMatches)
            .set({ status: "expired", updatedAt: now })
            .where(eq(mutualMatches.legacyDateMatchId, dateMatchId));

        return {
            status: "expired",
            dateMatchId,
            credited,
            lowIntentIncremented,
            userAId: match.userAId,
            userBId: match.userBId,
            payerUserId,
        };
    });
}

export async function runPaymentExpirySweep(): Promise<PaymentExpirySweepResult> {
    const ids = await findPaymentExpiredDateMatchIds();
    const summary: PaymentExpirySweepResult = {
        scanned: ids.length,
        expired: 0,
        credited: 0,
        lowIntentIncremented: 0,
        skipped: 0,
    };

    for (const id of ids) {
        const result = await expirePaymentMatch(id);
        if (result.status === "skipped") {
            summary.skipped += 1;
            continue;
        }

        summary.expired += 1;
        if (result.credited) summary.credited += 1;
        if (result.lowIntentIncremented) summary.lowIntentIncremented += 1;

        await notifyPaymentMatchExpired({
            dateMatchId: result.dateMatchId,
            userAId: result.userAId,
            userBId: result.userBId,
            credited: result.credited,
            payerUserId: result.payerUserId,
        }).catch((err) => {
            console.warn("[payment-expiry] push notification failed", {
                dateMatchId: result.dateMatchId,
                err,
            });
        });
    }

    return summary;
}
