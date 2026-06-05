"use server";

import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
    dateMatches,
    datePayments,
    mutualMatches,
    profiles,
    user,
    userCredits,
} from "@/db/schema";
import { getPaymentConfig } from "@/lib/payments/config";
import { adminRequestRefundForPayment } from "@/lib/payments/admin-refund";

export type AdminPaymentQueueKey =
    | "all"
    | "awaiting_payment"
    | "one_paid"
    | "both_paid"
    | "expired_with_credit"
    | "cancelled"
    | "refund_requested";

export interface AdminPaymentUser {
    id: string;
    firstName: string;
    name: string;
    email: string | null;
    lowIntentScore: number;
}

export interface AdminPaymentParticipantRow {
    paymentId: string | null;
    userId: string;
    user: AdminPaymentUser;
    status: string;
    provider: string | null;
    amountCents: number;
    currency: string;
    paystackReference: string | null;
    paystackTransactionId: string | null;
    paidAt: string | null;
    refundedAt: string | null;
    creditedAt: string | null;
    refundReason: string | null;
}

export interface AdminPaymentCreditRow {
    id: string;
    userId: string;
    user: AdminPaymentUser;
    amountCents: number;
    currency: string;
    reason: string;
    status: string;
    createdAt: string;
}

export interface AdminDateMatchPaymentDetail {
    dateMatchId: string;
    paymentState: string;
    paymentDueBy: string | null;
    paymentAmountCents: number;
    paymentCurrency: string;
    paidUserCount: number;
    matchStatus: string;
    scheduledAt: string | null;
    paymentAdminNotes: string | null;
    mutualMatchId: string | null;
    mutualStatus: string | null;
    userA: AdminPaymentUser;
    userB: AdminPaymentUser;
    participants: AdminPaymentParticipantRow[];
    credits: AdminPaymentCreditRow[];
}

export interface AdminPaymentQueueRow {
    dateMatchId: string;
    paymentState: string;
    paymentDueBy: string | null;
    scheduledAt: string | null;
    matchStatus: string;
    paidUserCount: number;
    userA: AdminPaymentUser;
    userB: AdminPaymentUser;
    queues: AdminPaymentQueueKey[];
}

export interface AdminPaymentReconciliation {
    collectedCents: number;
    activeCreditsCents: number;
    refundsPending: number;
    refundsCompleted: number;
}

export interface AdminPaymentQueuesResult {
    filter: AdminPaymentQueueKey;
    rows: AdminPaymentQueueRow[];
    reconciliation: AdminPaymentReconciliation;
    counts: Record<Exclude<AdminPaymentQueueKey, "all">, number>;
}

async function loadAdminPaymentUser(userId: string): Promise<AdminPaymentUser> {
    const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        with: { user: true },
    });
    const account =
        profile?.user ?? (await db.query.user.findFirst({ where: eq(user.id, userId) }));

    const firstName =
        profile?.firstName ?? account?.name?.split(" ")[0] ?? "User";

    return {
        id: userId,
        firstName,
        name: profile?.firstName
            ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}`
            : (account?.name ?? firstName),
        email: account?.email ?? null,
        lowIntentScore: Number(account?.lowIntentScore ?? 0),
    };
}

function resolveQueuesForMatch(input: {
    paymentState: string;
    hasActiveCredit: boolean;
    hasRefundRequested: boolean;
}): AdminPaymentQueueKey[] {
    const queues: AdminPaymentQueueKey[] = [];

    if (input.paymentState === "awaiting_payment") {
        queues.push("awaiting_payment");
    }
    if (input.paymentState === "paid_waiting_for_other") {
        queues.push("one_paid");
    }
    if (input.paymentState === "both_paid") {
        queues.push("both_paid");
    }
    if (input.paymentState === "expired" && input.hasActiveCredit) {
        queues.push("expired_with_credit");
    }
    if (input.paymentState === "cancelled") {
        queues.push("cancelled");
    }
    if (input.hasRefundRequested) {
        queues.push("refund_requested");
    }

    return queues;
}

export async function getAdminPaymentReconciliation(): Promise<AdminPaymentReconciliation> {
    await requireAdmin();

    const [[collected], [credits], [pending], [completed]] = await Promise.all([
        db
            .select({
                total: sql<number>`coalesce(sum(${datePayments.amountCents}), 0)::int`,
            })
            .from(datePayments)
            .where(eq(datePayments.status, "paid")),
        db
            .select({
                total: sql<number>`coalesce(sum(${userCredits.amountCents}), 0)::int`,
            })
            .from(userCredits)
            .where(eq(userCredits.status, "active")),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(datePayments)
            .where(eq(datePayments.status, "refund_requested")),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(datePayments)
            .where(eq(datePayments.status, "refunded")),
    ]);

    return {
        collectedCents: Number(collected?.total ?? 0),
        activeCreditsCents: Number(credits?.total ?? 0),
        refundsPending: Number(pending?.count ?? 0),
        refundsCompleted: Number(completed?.count ?? 0),
    };
}

export async function getAdminPaymentQueues(
    filter: AdminPaymentQueueKey = "all",
): Promise<AdminPaymentQueuesResult> {
    await requireAdmin();

    const reconciliation = await getAdminPaymentReconciliation();

    const paymentMatches = await db.query.dateMatches.findMany({
        where: and(
            ne(dateMatches.paymentState, "not_required"),
            inArray(dateMatches.paymentState, [
                "awaiting_payment",
                "paid_waiting_for_other",
                "both_paid",
                "expired",
                "cancelled",
            ]),
        ),
        orderBy: [desc(dateMatches.createdAt)],
        limit: 200,
    });

    const refundRequestedPayments = await db.query.datePayments.findMany({
        where: eq(datePayments.status, "refund_requested"),
        columns: { dateMatchId: true },
    });
    const refundMatchIds = new Set(refundRequestedPayments.map((p) => p.dateMatchId));

    const extraRefundMatches =
        refundMatchIds.size > 0
            ? await db.query.dateMatches.findMany({
                  where: and(
                      inArray(dateMatches.id, [...refundMatchIds]),
                      eq(dateMatches.paymentState, "not_required"),
                  ),
              })
            : [];

    const allMatches = [
        ...paymentMatches,
        ...extraRefundMatches.filter(
            (m) => !paymentMatches.some((existing) => existing.id === m.id),
        ),
    ];

    const matchIds = allMatches.map((m) => m.id);
    const creditsByMatch = new Map<string, boolean>();

    if (matchIds.length > 0) {
        const creditRows = await db.query.userCredits.findMany({
            where: and(
                inArray(userCredits.dateMatchId, matchIds),
                eq(userCredits.status, "active"),
            ),
            columns: { dateMatchId: true },
        });
        for (const row of creditRows) {
            if (row.dateMatchId) creditsByMatch.set(row.dateMatchId, true);
        }
    }

    const rows: AdminPaymentQueueRow[] = [];

    for (const match of allMatches) {
        const queues = resolveQueuesForMatch({
            paymentState: match.paymentState,
            hasActiveCredit: creditsByMatch.get(match.id) ?? false,
            hasRefundRequested: refundMatchIds.has(match.id),
        });

        if (queues.length === 0) continue;

        const [userA, userB] = await Promise.all([
            loadAdminPaymentUser(match.userAId),
            loadAdminPaymentUser(match.userBId),
        ]);

        rows.push({
            dateMatchId: match.id,
            paymentState: match.paymentState,
            paymentDueBy: match.paymentDueBy?.toISOString() ?? null,
            scheduledAt: match.scheduledAt?.toISOString() ?? null,
            matchStatus: match.status,
            paidUserCount: match.paidUserCount,
            userA,
            userB,
            queues,
        });
    }

    const counts: AdminPaymentQueuesResult["counts"] = {
        awaiting_payment: rows.filter((r) => r.queues.includes("awaiting_payment")).length,
        one_paid: rows.filter((r) => r.queues.includes("one_paid")).length,
        both_paid: rows.filter((r) => r.queues.includes("both_paid")).length,
        expired_with_credit: rows.filter((r) => r.queues.includes("expired_with_credit")).length,
        cancelled: rows.filter((r) => r.queues.includes("cancelled")).length,
        refund_requested: rows.filter((r) => r.queues.includes("refund_requested")).length,
    };

    const filtered =
        filter === "all" ? rows : rows.filter((r) => r.queues.includes(filter));

    return {
        filter,
        rows: filtered,
        reconciliation,
        counts,
    };
}

export async function getAdminPaymentsForDateMatch(
    dateMatchId: string,
): Promise<AdminDateMatchPaymentDetail | null> {
    await requireAdmin();

    const match = await db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, dateMatchId),
    });

    if (!match) return null;

    const [payments, credits, mutual, userA, userB] = await Promise.all([
        db.query.datePayments.findMany({
            where: eq(datePayments.dateMatchId, dateMatchId),
            orderBy: [desc(datePayments.createdAt)],
        }),
        db.query.userCredits.findMany({
            where: eq(userCredits.dateMatchId, dateMatchId),
            orderBy: [desc(userCredits.createdAt)],
        }),
        db.query.mutualMatches.findFirst({
            where: eq(mutualMatches.legacyDateMatchId, dateMatchId),
        }),
        loadAdminPaymentUser(match.userAId),
        loadAdminPaymentUser(match.userBId),
    ]);

    const paymentByUser = new Map(payments.map((p) => [p.userId, p]));

    const participants: AdminPaymentParticipantRow[] = await Promise.all(
        [match.userAId, match.userBId].map(async (userId) => {
            const payment = paymentByUser.get(userId);
            const participantUser = userId === match.userAId ? userA : userB;

            if (!payment) {
                return {
                    paymentId: null,
                    userId,
                    user: participantUser,
                    status: "none",
                    provider: null,
                    amountCents: match.paymentAmountCents,
                    currency: match.paymentCurrency,
                    paystackReference: null,
                    paystackTransactionId: null,
                    paidAt: null,
                    refundedAt: null,
                    creditedAt: null,
                    refundReason: null,
                };
            }

            return {
                paymentId: payment.id,
                userId,
                user: participantUser,
                status: payment.status,
                provider: payment.provider,
                amountCents: payment.amountCents,
                currency: payment.currency,
                paystackReference: payment.paystackReference,
                paystackTransactionId: payment.paystackTransactionId,
                paidAt: payment.paidAt?.toISOString() ?? null,
                refundedAt: payment.refundedAt?.toISOString() ?? null,
                creditedAt: payment.creditedAt?.toISOString() ?? null,
                refundReason: payment.refundReason,
            };
        }),
    );

    const creditRows: AdminPaymentCreditRow[] = await Promise.all(
        credits.map(async (credit) => ({
            id: credit.id,
            userId: credit.userId,
            user: await loadAdminPaymentUser(credit.userId),
            amountCents: credit.amountCents,
            currency: credit.currency,
            reason: credit.reason,
            status: credit.status,
            createdAt: credit.createdAt.toISOString(),
        })),
    );

    return {
        dateMatchId: match.id,
        paymentState: match.paymentState,
        paymentDueBy: match.paymentDueBy?.toISOString() ?? null,
        paymentAmountCents: match.paymentAmountCents,
        paymentCurrency: match.paymentCurrency,
        paidUserCount: match.paidUserCount,
        matchStatus: match.status,
        scheduledAt: match.scheduledAt?.toISOString() ?? null,
        paymentAdminNotes: match.paymentAdminNotes ?? null,
        mutualMatchId: mutual?.id ?? null,
        mutualStatus: mutual?.status ?? null,
        userA,
        userB,
        participants,
        credits: creditRows,
    };
}

function revalidatePaymentAdmin() {
    revalidatePath("/admin/payments");
}

export async function adminIssueCredit(input: {
    userId: string;
    dateMatchId?: string;
    amountCents?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
    const session = await requireAdmin();

    const account = await db.query.user.findFirst({ where: eq(user.id, input.userId) });
    if (!account) {
        return { ok: false, reason: "User not found" };
    }

    if (input.dateMatchId) {
        const match = await db.query.dateMatches.findFirst({
            where: eq(dateMatches.id, input.dateMatchId),
        });
        if (!match) {
            return { ok: false, reason: "Date match not found" };
        }
    }

    const { amountCents, currency } = getPaymentConfig();

    await db.insert(userCredits).values({
        userId: input.userId,
        amountCents: input.amountCents ?? amountCents,
        currency,
        reason: "admin_credit",
        dateMatchId: input.dateMatchId ?? null,
        status: "active",
    });

    if (input.dateMatchId) {
        const note = `[${new Date().toISOString()}] ${session.user.email ?? session.user.id} issued KES ${((input.amountCents ?? amountCents) / 100).toFixed(0)} credit`;
        await appendPaymentAdminNote(input.dateMatchId, note);
    }

    revalidatePaymentAdmin();
    if (input.dateMatchId) {
        revalidatePath(`/admin/payments/${input.dateMatchId}`);
    }

    return { ok: true };
}

export async function adminInitiateRefund(input: {
    paymentId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
    const session = await requireAdmin();

    const payment = await db.query.datePayments.findFirst({
        where: eq(datePayments.id, input.paymentId),
    });

    if (!payment) {
        return { ok: false, reason: "Payment not found" };
    }

    const result = await adminRequestRefundForPayment(input.paymentId, {
        refundReason: "admin_refund",
    });

    if (!result.ok) {
        return result;
    }

    const note = `[${new Date().toISOString()}] ${session.user.email ?? session.user.id} initiated refund for ${result.reference}`;
    await appendPaymentAdminNote(payment.dateMatchId, note);

    revalidatePaymentAdmin();
    revalidatePath(`/admin/payments/${payment.dateMatchId}`);

    return { ok: true };
}

export async function adminFlagLowIntent(input: {
    userId: string;
    increment?: number;
    dateMatchId?: string;
}): Promise<{ ok: true; lowIntentScore: number } | { ok: false; reason: string }> {
    const session = await requireAdmin();
    const delta = input.increment ?? 1;

    const account = await db.query.user.findFirst({ where: eq(user.id, input.userId) });
    if (!account) {
        return { ok: false, reason: "User not found" };
    }

    const now = new Date();
    const [updated] = await db
        .update(user)
        .set({
            lowIntentScore: sql`${user.lowIntentScore} + ${delta}`,
            updatedAt: now,
        })
        .where(eq(user.id, input.userId))
        .returning({ lowIntentScore: user.lowIntentScore });

    if (input.dateMatchId) {
        const note = `[${new Date().toISOString()}] ${session.user.email ?? session.user.id} bumped low_intent_score by ${delta} for user ${input.userId}`;
        await appendPaymentAdminNote(input.dateMatchId, note);
    }

    revalidatePaymentAdmin();
    if (input.dateMatchId) {
        revalidatePath(`/admin/payments/${input.dateMatchId}`);
    }

    return { ok: true, lowIntentScore: Number(updated?.lowIntentScore ?? 0) };
}

async function appendPaymentAdminNote(dateMatchId: string, line: string) {
    const match = await db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, dateMatchId),
        columns: { paymentAdminNotes: true },
    });

    const next = match?.paymentAdminNotes ? `${match.paymentAdminNotes}\n${line}` : line;

    await db
        .update(dateMatches)
        .set({ paymentAdminNotes: next })
        .where(eq(dateMatches.id, dateMatchId));
}

export async function adminAddPaymentNote(input: {
    dateMatchId: string;
    note: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
    const session = await requireAdmin();

    const trimmed = input.note.trim();
    if (!trimmed) {
        return { ok: false, reason: "Note cannot be empty" };
    }

    const match = await db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, input.dateMatchId),
    });
    if (!match) {
        return { ok: false, reason: "Date match not found" };
    }

    const line = `[${new Date().toISOString()}] ${session.user.email ?? session.user.id}: ${trimmed}`;
    await appendPaymentAdminNote(input.dateMatchId, line);

    revalidatePaymentAdmin();
    revalidatePath(`/admin/payments/${input.dateMatchId}`);

    return { ok: true };
}
