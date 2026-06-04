import { and, eq } from "drizzle-orm";

import { dateMatches, datePayments, user } from "@/db/schema";
import { db } from "@/lib/db";
import { getPaymentConfig } from "@/lib/payments/config";
import { buildPaymentReference } from "@/lib/payments/references";

export async function findDateMatchById(dateMatchId: string) {
    return db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, dateMatchId),
    });
}

export async function findUserPaymentForMatch(dateMatchId: string, userId: string) {
    return db.query.datePayments.findFirst({
        where: and(
            eq(datePayments.dateMatchId, dateMatchId),
            eq(datePayments.userId, userId),
        ),
    });
}

export async function findUserEmail(userId: string): Promise<string | null> {
    const row = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { email: true },
    });
    return row?.email ?? null;
}

/**
 * Returns a pending Paystack reference for this user+match.
 * Reuses an existing pending row; replaces failed/cancelled rows with a fresh reference.
 */
export async function ensurePendingPaystackPayment(input: {
    dateMatchId: string;
    userId: string;
}): Promise<{ reference: string; reused: boolean }> {
    const { amountCents, currency } = getPaymentConfig();
    const existing = await findUserPaymentForMatch(input.dateMatchId, input.userId);

    if (existing?.status === "pending") {
        return { reference: existing.paystackReference, reused: true };
    }

    const reference = buildPaymentReference(input.dateMatchId, input.userId);
    const now = new Date();

    if (existing) {
        await db
            .update(datePayments)
            .set({
                paystackReference: reference,
                amountCents,
                currency,
                provider: "paystack",
                status: "pending",
                paidAt: null,
                refundedAt: null,
                creditedAt: null,
                refundReason: null,
                paystackTransactionId: null,
                updatedAt: now,
            })
            .where(eq(datePayments.id, existing.id));

        return { reference, reused: false };
    }

    await db.insert(datePayments).values({
        dateMatchId: input.dateMatchId,
        userId: input.userId,
        amountCents,
        currency,
        provider: "paystack",
        paystackReference: reference,
        status: "pending",
        createdAt: now,
        updatedAt: now,
    });

    return { reference, reused: false };
}
