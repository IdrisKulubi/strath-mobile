import { and, asc, eq, inArray, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { userCredits } from "@/db/schema";
import { getPaymentConfig } from "@/lib/payments/config";

export const CONFIRMATION_PACK_PURCHASE_REASON = "confirmation_pack_purchase";
export const CONFIRMATION_RESTORED_REASON = "confirmation_restored";
export const ADMIN_RESTORE_REASON = "admin_restore";

const CONFIRMATION_CREDIT_REASONS = [
    CONFIRMATION_PACK_PURCHASE_REASON,
    CONFIRMATION_RESTORED_REASON,
    ADMIN_RESTORE_REASON,
] as const;

export type ConfirmationBalance = {
    available: number;
    reserved: number;
    total: number;
};

export type ConfirmationBalanceTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function isConfirmationCreditReason(reason: string): boolean {
    return (CONFIRMATION_CREDIT_REASONS as readonly string[]).includes(reason);
}

export function countBalanceFromRows(
    rows: Array<{ status: string }>,
): ConfirmationBalance {
    let available = 0;
    let reserved = 0;

    for (const row of rows) {
        if (row.status === "active") available += 1;
        else if (row.status === "reserved") reserved += 1;
    }

    return { available, reserved, total: available + reserved };
}

export async function getConfirmationBalance(userId: string): Promise<ConfirmationBalance> {
    const rows = await db.query.userCredits.findMany({
        where: and(
            eq(userCredits.userId, userId),
            inArray(userCredits.reason, [...CONFIRMATION_CREDIT_REASONS]),
            inArray(userCredits.status, ["active", "reserved"]),
        ),
        columns: { status: true },
    });

    return countBalanceFromRows(rows);
}

export async function canConfirmWithBalance(userId: string): Promise<boolean> {
    const balance = await getConfirmationBalance(userId);
    return balance.available >= 1;
}

export async function hasReservedForMatch(
    userId: string,
    dateMatchId: string,
): Promise<boolean> {
    const row = await db.query.userCredits.findFirst({
        where: and(
            eq(userCredits.userId, userId),
            eq(userCredits.dateMatchId, dateMatchId),
            eq(userCredits.status, "reserved"),
            inArray(userCredits.reason, [...CONFIRMATION_CREDIT_REASONS]),
        ),
        columns: { id: true },
    });

    return Boolean(row);
}

export async function grantConfirmationPack(
    tx: ConfirmationBalanceTx,
    input: {
        userId: string;
        paymentId: string;
        count?: number;
        now?: Date;
    },
): Promise<{ granted: number }> {
    const { packSize, unitCents, currency } = getPaymentConfig();
    const count = input.count ?? packSize;
    const now = input.now ?? new Date();

    const existing = await tx.query.userCredits.findMany({
        where: and(
            eq(userCredits.paymentId, input.paymentId),
            eq(userCredits.reason, CONFIRMATION_PACK_PURCHASE_REASON),
        ),
        columns: { id: true },
    });

    if (existing.length > 0) {
        return { granted: existing.length };
    }

    for (let i = 0; i < count; i += 1) {
        await tx.insert(userCredits).values({
            userId: input.userId,
            amountCents: unitCents,
            currency,
            reason: CONFIRMATION_PACK_PURCHASE_REASON,
            paymentId: input.paymentId,
            status: "active",
            createdAt: now,
        });
    }

    return { granted: count };
}

export async function reserveConfirmationForMatch(
    tx: ConfirmationBalanceTx,
    userId: string,
    dateMatchId: string,
    now: Date = new Date(),
): Promise<{ reserved: boolean }> {
    const existing = await tx.query.userCredits.findFirst({
        where: and(
            eq(userCredits.userId, userId),
            eq(userCredits.dateMatchId, dateMatchId),
            eq(userCredits.status, "reserved"),
            inArray(userCredits.reason, [...CONFIRMATION_CREDIT_REASONS]),
        ),
        columns: { id: true },
    });

    if (existing) {
        return { reserved: true };
    }

    const [candidate] = await tx
        .select({ id: userCredits.id })
        .from(userCredits)
        .where(
            and(
                eq(userCredits.userId, userId),
                eq(userCredits.status, "active"),
                inArray(userCredits.reason, [...CONFIRMATION_CREDIT_REASONS]),
            ),
        )
        .orderBy(asc(userCredits.createdAt))
        .limit(1);

    if (!candidate) {
        return { reserved: false };
    }

    await tx
        .update(userCredits)
        .set({
            status: "reserved",
            dateMatchId,
        })
        .where(eq(userCredits.id, candidate.id));

    return { reserved: true };
}

export async function spendReservedConfirmation(
    tx: ConfirmationBalanceTx,
    userId: string,
    dateMatchId: string,
    now: Date = new Date(),
): Promise<{ spent: boolean }> {
    const reserved = await tx.query.userCredits.findFirst({
        where: and(
            eq(userCredits.userId, userId),
            eq(userCredits.dateMatchId, dateMatchId),
            eq(userCredits.status, "reserved"),
            inArray(userCredits.reason, [...CONFIRMATION_CREDIT_REASONS]),
        ),
    });

    if (!reserved) {
        return { spent: false };
    }

    if (reserved.status === "spent") {
        return { spent: true };
    }

    await tx
        .update(userCredits)
        .set({
            status: "spent",
            usedAt: now,
        })
        .where(eq(userCredits.id, reserved.id));

    return { spent: true };
}

export async function restoreReservedConfirmation(
    tx: ConfirmationBalanceTx,
    userId: string,
    dateMatchId: string,
): Promise<{ restored: boolean }> {
    const reserved = await tx.query.userCredits.findFirst({
        where: and(
            eq(userCredits.userId, userId),
            eq(userCredits.dateMatchId, dateMatchId),
            eq(userCredits.status, "reserved"),
            inArray(userCredits.reason, [...CONFIRMATION_CREDIT_REASONS]),
        ),
    });

    if (!reserved) {
        return { restored: false };
    }

    await tx
        .update(userCredits)
        .set({
            status: "active",
            dateMatchId: null,
            reason: CONFIRMATION_RESTORED_REASON,
        })
        .where(eq(userCredits.id, reserved.id));

    return { restored: true };
}

export async function restoreAllReservedForMatch(
    tx: ConfirmationBalanceTx,
    dateMatchId: string,
): Promise<string[]> {
    const reservedRows = await tx.query.userCredits.findMany({
        where: and(
            eq(userCredits.dateMatchId, dateMatchId),
            eq(userCredits.status, "reserved"),
            inArray(userCredits.reason, [...CONFIRMATION_CREDIT_REASONS]),
        ),
        columns: { userId: true },
    });

    const restoredUserIds: string[] = [];

    for (const row of reservedRows) {
        const result = await restoreReservedConfirmation(tx, row.userId, dateMatchId);
        if (result.restored) {
            restoredUserIds.push(row.userId);
        }
    }

    return restoredUserIds;
}

export async function countParticipantsWithReservedOrPaid(
    dateMatchId: string,
    userAId: string,
    userBId: string,
    executor: typeof db | ConfirmationBalanceTx = db,
): Promise<number> {
    const [reservedCount] = await executor
        .select({ count: sql<number>`count(distinct ${userCredits.userId})::int` })
        .from(userCredits)
        .where(
            and(
                eq(userCredits.dateMatchId, dateMatchId),
                eq(userCredits.status, "reserved"),
                inArray(userCredits.userId, [userAId, userBId]),
                inArray(userCredits.reason, [...CONFIRMATION_CREDIT_REASONS]),
            ),
        );

    return Number(reservedCount?.count ?? 0);
}
