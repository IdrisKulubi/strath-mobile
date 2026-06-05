import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { dateMatches, datePayments, userCredits } from "@/db/schema";
import { getPaymentConfig } from "@/lib/payments/config";

export const CREDIT_CANCEL_REASON = "date_cancelled";

export type CreditPaidUsersOnCancellationResult = {
    dateMatchId: string;
    creditedUserIds: string[];
    /** userId -> amountCents credited */
    amountByUser: Record<string, number>;
    paymentStateUpdated: boolean;
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * On user-initiated date cancel: credit every payer, close out payment_state.
 * Idempotent per payment row (skips if credit already exists for paymentId).
 */
export async function creditPaidUsersOnCancellation(
    tx: DbTransaction,
    dateMatchId: string,
    now: Date = new Date(),
): Promise<CreditPaidUsersOnCancellationResult> {
    const match = await tx.query.dateMatches.findFirst({
        where: eq(dateMatches.id, dateMatchId),
    });

    const empty: CreditPaidUsersOnCancellationResult = {
        dateMatchId,
        creditedUserIds: [],
        amountByUser: {},
        paymentStateUpdated: false,
    };

    if (!match || match.paymentState === "not_required") {
        return empty;
    }

    const payments = await tx.query.datePayments.findMany({
        where: eq(datePayments.dateMatchId, dateMatchId),
    });

    const creditedUserIds: string[] = [];
    const amountByUser: Record<string, number> = {};
    const { amountCents: defaultAmountCents, currency: defaultCurrency } = getPaymentConfig();

    for (const payment of payments) {
        if (payment.status !== "paid") continue;

        const existingCredit = await tx.query.userCredits.findFirst({
            where: eq(userCredits.paymentId, payment.id),
        });
        if (existingCredit) continue;

        const amount = payment.amountCents ?? defaultAmountCents;
        const currency = payment.currency ?? defaultCurrency;

        await tx.insert(userCredits).values({
            userId: payment.userId,
            amountCents: amount,
            currency,
            reason: CREDIT_CANCEL_REASON,
            dateMatchId,
            paymentId: payment.id,
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
            .where(eq(datePayments.id, payment.id));

        creditedUserIds.push(payment.userId);
        amountByUser[payment.userId] = amount;
    }

    await tx
        .update(dateMatches)
        .set({
            paymentState: "cancelled",
            paidUserCount: 0,
        })
        .where(eq(dateMatches.id, dateMatchId));

    return {
        dateMatchId,
        creditedUserIds,
        amountByUser,
        paymentStateUpdated: true,
    };
}
