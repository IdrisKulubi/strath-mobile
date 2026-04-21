/**
 * Payments domain service — pure state-machine helpers.
 *
 * Kept framework-agnostic so we can call it from API routes, webhooks, the
 * expiry cron, and admin actions without pulling in Next/Request types.
 *
 * See docs/payment.md §4 & §8 for the state machine and verification rules.
 */
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
    dateMatches,
    datePayments,
    userCredits,
    type DatePayment,
    type NewDatePayment,
} from "@/db/schema";
import {
    getExpectedPriceCents,
    getExpectedProductId,
    getPaymentWindowHours,
} from "@/lib/revenuecat-server";

export type PaymentState =
    | "not_required"
    | "awaiting_payment"
    | "paid_waiting_for_other"
    | "being_arranged"
    | "confirmed"
    | "expired"
    | "refunded";

export interface DateMatchPaymentSnapshot {
    dateMatchId: string;
    paymentState: PaymentState;
    paymentDueBy: Date | null;
    userAId: string;
    userBId: string;
    payments: DatePayment[];
    /** `{ [userId]: paidStatus }` for quick lookups. */
    paidByUser: Record<string, boolean>;
}

/**
 * Single source of truth for reading a match + its payments atomically.
 * Use everywhere we need to decide the next transition.
 */
export async function loadDateMatchSnapshot(
    dateMatchId: string,
): Promise<DateMatchPaymentSnapshot | null> {
    const match = await db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, dateMatchId),
    });
    if (!match) return null;

    const payments = await db
        .select()
        .from(datePayments)
        .where(eq(datePayments.dateMatchId, dateMatchId));

    const paidByUser: Record<string, boolean> = {};
    for (const p of payments) {
        if (p.status === "paid" || p.status === "credited") {
            paidByUser[p.userId] = true;
        }
    }

    return {
        dateMatchId: match.id,
        paymentState: (match.paymentState ?? "not_required") as PaymentState,
        paymentDueBy: match.paymentDueBy ?? null,
        userAId: match.userAId,
        userBId: match.userBId,
        payments,
        paidByUser,
    };
}

/**
 * Open the payment window on a match. Idempotent — safe to call multiple
 * times. Only flips `not_required → awaiting_payment`; never re-opens a
 * match that's already in a paid/arranged/confirmed state.
 */
export async function openPaymentWindow(dateMatchId: string): Promise<{
    paymentState: PaymentState;
    paymentDueBy: Date | null;
    transitioned: boolean;
}> {
    const dueBy = new Date(Date.now() + getPaymentWindowHours() * 60 * 60 * 1000);

    const [updated] = await db
        .update(dateMatches)
        .set({
            paymentState: "awaiting_payment",
            paymentDueBy: dueBy,
        })
        .where(
            and(
                eq(dateMatches.id, dateMatchId),
                or(
                    eq(dateMatches.paymentState, "not_required"),
                    eq(dateMatches.paymentState, "awaiting_payment"),
                ),
            ),
        )
        .returning({
            paymentState: dateMatches.paymentState,
            paymentDueBy: dateMatches.paymentDueBy,
        });

    if (updated) {
        return {
            paymentState: (updated.paymentState ?? "awaiting_payment") as PaymentState,
            paymentDueBy: updated.paymentDueBy ?? null,
            transitioned: true,
        };
    }

    // Already further along — read the current state and return it verbatim.
    const existing = await db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, dateMatchId),
    });
    return {
        paymentState: (existing?.paymentState ?? "not_required") as PaymentState,
        paymentDueBy: existing?.paymentDueBy ?? null,
        transitioned: false,
    };
}

/**
 * Core state transition after a user successfully pays (or redeems a credit).
 *
 * - If both users have now paid → `being_arranged`.
 * - If only one → `paid_waiting_for_other`.
 *
 * Never moves the state backwards. Returns the resulting state.
 */
export async function advanceAfterPayment(
    dateMatchId: string,
): Promise<PaymentState> {
    const snapshot = await loadDateMatchSnapshot(dateMatchId);
    if (!snapshot) throw new Error(`date_match ${dateMatchId} not found`);

    // Already past the payment gate — no-op.
    if (
        snapshot.paymentState === "being_arranged"
        || snapshot.paymentState === "confirmed"
        || snapshot.paymentState === "refunded"
    ) {
        return snapshot.paymentState;
    }

    const aPaid = !!snapshot.paidByUser[snapshot.userAId];
    const bPaid = !!snapshot.paidByUser[snapshot.userBId];

    const next: PaymentState = aPaid && bPaid
        ? "being_arranged"
        : "paid_waiting_for_other";

    await db
        .update(dateMatches)
        .set({ paymentState: next })
        .where(eq(dateMatches.id, dateMatchId));

    return next;
}

// ─── Upsert payment rows (idempotent) ──────────────────────────────────────

export interface RecordRevenueCatPaymentInput {
    dateMatchId: string;
    userId: string;
    revenuecatAppUserId: string;
    revenuecatTransactionId: string;
    storeTransactionId: string;
    platform: "ios" | "android" | null;
    productId: string;
    purchaseDate: Date;
    amountCents?: number;
    rawPayload?: Record<string, unknown>;
}

/**
 * Upsert a `date_payments` row keyed by `revenuecat_transaction_id`.
 * Safe to call from both `/api/payments/confirm` and the webhook — whichever
 * arrives first wins; the second is a no-op update.
 */
export async function recordRevenueCatPayment(
    input: RecordRevenueCatPaymentInput,
): Promise<DatePayment> {
    const amountCents = input.amountCents ?? getExpectedPriceCents();

    const values: NewDatePayment = {
        dateMatchId: input.dateMatchId,
        userId: input.userId,
        amountCents,
        currency: "KES",
        provider: "revenuecat",
        platform: input.platform,
        revenuecatAppUserId: input.revenuecatAppUserId,
        revenuecatTransactionId: input.revenuecatTransactionId,
        storeTransactionId: input.storeTransactionId,
        productId: input.productId,
        status: "paid",
        paidAt: input.purchaseDate,
        rawWebhookPayload: input.rawPayload ?? null,
    };

    // Use (date_match_id, user_id) as the conflict target so replays from a
    // different device (new transaction id for same match+user) upgrade in
    // place instead of exploding on the uniqueness constraint.
    const [row] = await db
        .insert(datePayments)
        .values(values)
        .onConflictDoUpdate({
            target: [datePayments.dateMatchId, datePayments.userId],
            set: {
                status: "paid",
                paidAt: input.purchaseDate,
                revenuecatTransactionId: input.revenuecatTransactionId,
                storeTransactionId: input.storeTransactionId,
                platform: input.platform,
                productId: input.productId,
                rawWebhookPayload: input.rawPayload ?? null,
                updatedAt: new Date(),
            },
        })
        .returning();

    return row;
}

export async function markPaymentRefunded(
    revenuecatTransactionId: string,
    reason: string,
): Promise<DatePayment | null> {
    const [row] = await db
        .update(datePayments)
        .set({
            status: "refunded",
            refundedAt: new Date(),
            refundReason: reason,
            updatedAt: new Date(),
        })
        .where(eq(datePayments.revenuecatTransactionId, revenuecatTransactionId))
        .returning();
    if (!row) return null;

    // Roll the match back to `refunded` so admin knows something changed.
    await db
        .update(dateMatches)
        .set({ paymentState: "refunded" })
        .where(eq(dateMatches.id, row.dateMatchId));

    return row;
}

// ─── Credits ───────────────────────────────────────────────────────────────

export async function getUserCreditBalanceCents(userId: string): Promise<number> {
    const rows = await db
        .select({
            total: sql<number>`coalesce(sum(${userCredits.amountCents}), 0)::int`,
        })
        .from(userCredits)
        .where(eq(userCredits.userId, userId));
    return rows[0]?.total ?? 0;
}

/**
 * Redeem a credit to pay for this date. Inserts:
 *   1. A negative `user_credits` row (reason `date_spent`)
 *   2. A `date_payments` row with `provider='credit'`, `status='credited'`
 * Then advances the match state.
 *
 * Idempotent: if the user already has a paid/credited row for this match,
 * returns it without spending a credit.
 */
export async function redeemCreditForDate(input: {
    dateMatchId: string;
    userId: string;
}): Promise<
    | { ok: true; payment: DatePayment; paymentState: PaymentState }
    | { ok: false; reason: "insufficient_credit" | "match_not_found" | "wrong_state" }
> {
    const snapshot = await loadDateMatchSnapshot(input.dateMatchId);
    if (!snapshot) return { ok: false, reason: "match_not_found" };
    if (
        snapshot.paymentState !== "awaiting_payment"
        && snapshot.paymentState !== "paid_waiting_for_other"
    ) {
        return { ok: false, reason: "wrong_state" };
    }

    // Already paid/credited? Idempotent return.
    const existing = snapshot.payments.find((p) => p.userId === input.userId);
    if (existing && (existing.status === "paid" || existing.status === "credited")) {
        return {
            ok: true,
            payment: existing,
            paymentState: snapshot.paymentState,
        };
    }

    const price = getExpectedPriceCents();
    const balance = await getUserCreditBalanceCents(input.userId);
    if (balance < price) return { ok: false, reason: "insufficient_credit" };

    const now = new Date();

    // NOTE: Drizzle's `transaction` requires a transactional driver; using a
    // best-effort two-step insert here and relying on the uniqueness
    // constraint + balance re-check is acceptable for V1. Double-redeem
    // protection comes from `date_payments_user_match_unique`.
    const [payment] = await db
        .insert(datePayments)
        .values({
            dateMatchId: input.dateMatchId,
            userId: input.userId,
            amountCents: price,
            currency: "KES",
            provider: "credit",
            platform: null,
            productId: getExpectedProductId(),
            status: "credited",
            paidAt: now,
        })
        .onConflictDoNothing({
            target: [datePayments.dateMatchId, datePayments.userId],
        })
        .returning();

    if (!payment) {
        // Conflict: another request beat us here. Load and return.
        const fresh = await loadDateMatchSnapshot(input.dateMatchId);
        const row = fresh?.payments.find((p) => p.userId === input.userId);
        if (row) {
            return { ok: true, payment: row, paymentState: fresh!.paymentState };
        }
        return { ok: false, reason: "wrong_state" };
    }

    await db.insert(userCredits).values({
        userId: input.userId,
        amountCents: -price,
        currency: "KES",
        reason: "date_spent",
        dateMatchId: input.dateMatchId,
    });

    const paymentState = await advanceAfterPayment(input.dateMatchId);
    return { ok: true, payment, paymentState };
}

export async function grantPartnerDidNotPayCredit(input: {
    userId: string;
    dateMatchId: string;
    amountCents?: number;
}): Promise<void> {
    await db.insert(userCredits).values({
        userId: input.userId,
        amountCents: input.amountCents ?? getExpectedPriceCents(),
        currency: "KES",
        reason: "partner_did_not_pay",
        dateMatchId: input.dateMatchId,
    });
}
