"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
    Banknote,
    CheckCircle2,
    CircleDollarSign,
    Clock,
    Gift,
    RefreshCcw,
    Undo2,
    XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/custom-toast";
import {
    getAdminMatchPayments,
    refundDatePayment,
    grantUserCredit,
    type AdminMatchPaymentRow,
    type AdminMatchPaymentsSummary,
} from "@/lib/actions/admin";

interface PaymentsPanelProps {
    /** Date match id. Not the candidate-pair mutual match id. */
    dateMatchId: string | null | undefined;
}

/**
 * Admin tooling for the pay-per-date flow (docs/payment.md §13). Lists each
 * user's payment row and exposes two ops actions:
 *
 *   1. **Refund** — flips the `date_payments.status` to `refunded` and
 *      optionally issues a make-good credit. Store-side money movement
 *      (Apple / Google) is handled out-of-band — this records the decision
 *      and restores the user's in-app balance.
 *   2. **Grant credit** — zero-questions-asked goodwill drop into a user's
 *      credit ledger. Used for partner no-shows, make-goods, or promos.
 */
export function PaymentsPanel({ dateMatchId }: PaymentsPanelProps) {
    const [summary, setSummary] = useState<AdminMatchPaymentsSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        if (!dateMatchId) return;
        setLoading(true);
        setError(null);
        try {
            const next = await getAdminMatchPayments(dateMatchId);
            setSummary(next);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load payments");
        } finally {
            setLoading(false);
        }
    }, [dateMatchId]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    if (!dateMatchId) return null;

    return (
        <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Payments
                </h3>
                <button
                    type="button"
                    onClick={fetchSummary}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/80 disabled:opacity-40"
                >
                    <RefreshCcw className={cn("size-3", loading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
                    {error}
                </div>
            )}

            {loading && !summary ? (
                <PaymentsSkeleton />
            ) : !summary ? (
                <div className="rounded-2xl bg-white/[0.03] px-3 py-4 text-[12px] text-white/50 ring-1 ring-inset ring-white/[0.04]">
                    No payment record for this match.
                </div>
            ) : (
                <div className="space-y-3">
                    <PaymentStateChip
                        state={summary.paymentState}
                        paymentDueBy={summary.paymentDueBy}
                    />
                    {summary.rows.map((row) => (
                        <PaymentRow
                            key={row.userId}
                            row={row}
                            dateMatchId={summary.dateMatchId}
                            onChanged={fetchSummary}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function PaymentStateChip({
    state,
    paymentDueBy,
}: {
    state: string;
    paymentDueBy: string | null;
}) {
    const meta = STATE_META[state] ?? STATE_META.not_required;
    const Icon = meta.icon;
    return (
        <div
            className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-inset",
                meta.tone,
            )}
        >
            <Icon className="size-3.5" />
            <div className="flex-1 text-[12px] font-medium">{meta.label}</div>
            {paymentDueBy && state === "awaiting_payment" && (
                <span className="text-[11px] opacity-70">
                    due {new Date(paymentDueBy).toLocaleString("en-KE", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </span>
            )}
        </div>
    );
}

function PaymentRow({
    row,
    dateMatchId,
    onChanged,
}: {
    row: AdminMatchPaymentRow;
    dateMatchId: string;
    onChanged: () => void;
}) {
    const [isRefunding, startRefund] = useTransition();
    const [showGrantForm, setShowGrantForm] = useState(false);

    const statusMeta = STATUS_META[row.status] ?? STATUS_META.pending;
    const StatusIcon = statusMeta.icon;
    const hasPayment = row.status !== "pending" || row.amountCents > 0;
    const canRefund = row.status === "paid" || row.status === "credited";

    const handleRefund = useCallback(
        (grantCredit: boolean) => {
            const reason = window.prompt(
                `Refund reason for ${row.firstName}? (required, shown in analytics)`,
                "Admin refund",
            );
            if (!reason || !reason.trim()) return;

            startRefund(async () => {
                try {
                    await refundDatePayment({
                        paymentId: row.id,
                        reason: reason.trim(),
                        grantCredit,
                    });
                    toast.success(
                        grantCredit
                            ? `Refund issued + credit granted to ${row.firstName}`
                            : `Payment marked refunded for ${row.firstName}`,
                    );
                    onChanged();
                } catch (err) {
                    toast.error(
                        "Refund failed",
                        err instanceof Error ? err.message : "Unknown error",
                    );
                }
            });
        },
        [row.id, row.firstName, onChanged],
    );

    return (
        <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.04]">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">{row.firstName}</p>
                    <p className="mt-0.5 text-[11px] text-white/50">
                        Credit balance: KES {(row.creditBalanceCents / 100).toFixed(0)}
                    </p>
                </div>
                <div
                    className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                        statusMeta.tone,
                    )}
                >
                    <StatusIcon className="size-3" />
                    {statusMeta.label}
                </div>
            </div>

            {hasPayment && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <InfoTile label="Amount">
                        {row.amountCents > 0
                            ? `${row.currency} ${(row.amountCents / 100).toFixed(0)}`
                            : "—"}
                    </InfoTile>
                    <InfoTile label="Provider">{providerLabel(row.provider)}</InfoTile>
                    <InfoTile label="Paid at" className="col-span-2">
                        {row.paidAt
                            ? new Date(row.paidAt).toLocaleString("en-KE", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                              })
                            : "—"}
                    </InfoTile>
                    {row.refundedAt && (
                        <InfoTile label="Refunded" className="col-span-2">
                            <span className="text-rose-300">
                                {new Date(row.refundedAt).toLocaleString("en-KE", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                })}
                                {row.refundReason ? ` · ${row.refundReason}` : ""}
                            </span>
                        </InfoTile>
                    )}
                </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
                {canRefund && (
                    <>
                        <button
                            type="button"
                            onClick={() => handleRefund(false)}
                            disabled={isRefunding}
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold text-rose-200 ring-1 ring-inset ring-rose-400/30 transition-colors hover:bg-rose-500/25 disabled:opacity-50"
                        >
                            <Undo2 className="size-3" />
                            Refund
                        </button>
                        <button
                            type="button"
                            onClick={() => handleRefund(true)}
                            disabled={isRefunding}
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-200 ring-1 ring-inset ring-amber-400/30 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
                        >
                            <Gift className="size-3" />
                            Refund + credit
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={() => setShowGrantForm((v) => !v)}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ring-inset transition-colors",
                        showGrantForm
                            ? "bg-white/10 text-white ring-white/20"
                            : "bg-emerald-500/10 text-emerald-200 ring-emerald-400/25 hover:bg-emerald-500/20",
                    )}
                >
                    <CircleDollarSign className="size-3" />
                    {showGrantForm ? "Cancel" : "Grant credit"}
                </button>
            </div>

            {showGrantForm && (
                <GrantCreditForm
                    userId={row.userId}
                    firstName={row.firstName}
                    dateMatchId={dateMatchId}
                    onDone={() => {
                        setShowGrantForm(false);
                        onChanged();
                    }}
                />
            )}
        </div>
    );
}

function GrantCreditForm({
    userId,
    firstName,
    dateMatchId,
    onDone,
}: {
    userId: string;
    firstName: string;
    dateMatchId: string;
    onDone: () => void;
}) {
    const [amountKes, setAmountKes] = useState("200");
    const [reason, setReason] = useState<
        "goodwill" | "promo" | "admin_refund" | "partner_did_not_pay"
    >("goodwill");
    const [notify, setNotify] = useState(true);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = useCallback(() => {
        const cents = Math.round(Number(amountKes) * 100);
        if (!Number.isFinite(cents) || cents <= 0) {
            toast.error("Invalid amount", "Enter a positive KES value");
            return;
        }
        startTransition(async () => {
            try {
                await grantUserCredit({
                    userId,
                    amountCents: cents,
                    reason,
                    dateMatchId,
                    notifyUser: notify,
                });
                toast.success(`KES ${Number(amountKes).toFixed(0)} credited to ${firstName}`);
                onDone();
            } catch (err) {
                toast.error(
                    "Grant failed",
                    err instanceof Error ? err.message : "Unknown error",
                );
            }
        });
    }, [amountKes, reason, notify, userId, firstName, dateMatchId, onDone]);

    return (
        <div className="mt-3 space-y-2 rounded-xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/[0.06]">
            <div className="grid grid-cols-2 gap-2">
                <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-white/60">Amount (KES)</span>
                    <input
                        type="number"
                        min={1}
                        step={1}
                        value={amountKes}
                        onChange={(e) => setAmountKes(e.target.value)}
                        className="w-full rounded-lg bg-black/30 px-2.5 py-1.5 text-[12px] text-white outline-none ring-1 ring-inset ring-white/10 focus:ring-white/30"
                    />
                </label>
                <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-white/60">Reason</span>
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value as typeof reason)}
                        className="w-full rounded-lg bg-black/30 px-2 py-1.5 text-[12px] text-white outline-none ring-1 ring-inset ring-white/10 focus:ring-white/30"
                    >
                        <option value="goodwill">Goodwill</option>
                        <option value="promo">Promo</option>
                        <option value="admin_refund">Admin refund</option>
                        <option value="partner_did_not_pay">Partner did not pay</option>
                    </select>
                </label>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-white/70">
                <input
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="accent-white"
                />
                Send push notification to user
            </label>
            <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-black shadow-lg transition-colors hover:bg-white/90 disabled:opacity-50"
            >
                <Banknote className="size-3.5" />
                {isPending ? "Granting…" : `Credit ${firstName}`}
            </button>
        </div>
    );
}

function InfoTile({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "rounded-lg bg-black/20 px-2.5 py-1.5 ring-1 ring-inset ring-white/[0.04]",
                className,
            )}
        >
            <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
            <p className="mt-0.5 text-[12px] text-white/90">{children}</p>
        </div>
    );
}

function PaymentsSkeleton() {
    return (
        <div className="space-y-2">
            <div className="h-10 animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="h-32 animate-pulse rounded-2xl bg-white/[0.04]" />
            <div className="h-32 animate-pulse rounded-2xl bg-white/[0.04]" />
        </div>
    );
}

// ─── Copy helpers ──────────────────────────────────────────────────────────

const STATE_META: Record<
    string,
    { label: string; tone: string; icon: typeof Clock }
> = {
    not_required: {
        label: "Legacy — no payment required",
        tone: "bg-white/[0.03] text-white/60 ring-white/10",
        icon: CheckCircle2,
    },
    awaiting_payment: {
        label: "Awaiting payment from both",
        tone: "bg-amber-500/15 text-amber-200 ring-amber-400/30",
        icon: Clock,
    },
    paid_waiting_for_other: {
        label: "One paid, waiting for partner",
        tone: "bg-amber-500/15 text-amber-200 ring-amber-400/30",
        icon: Clock,
    },
    being_arranged: {
        label: "Both paid — ready to arrange",
        tone: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
        icon: CheckCircle2,
    },
    confirmed: {
        label: "Confirmed + scheduled",
        tone: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
        icon: CheckCircle2,
    },
    expired: {
        label: "Payment window expired",
        tone: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
        icon: XCircle,
    },
    refunded: {
        label: "Refunded",
        tone: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
        icon: Undo2,
    },
};

const STATUS_META: Record<
    string,
    { label: string; tone: string; icon: typeof Clock }
> = {
    pending: {
        label: "Not paid",
        tone: "bg-white/[0.04] text-white/60 ring-white/15",
        icon: Clock,
    },
    paid: {
        label: "Paid",
        tone: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
        icon: CheckCircle2,
    },
    credited: {
        label: "Credit",
        tone: "bg-sky-500/15 text-sky-200 ring-sky-400/30",
        icon: Gift,
    },
    failed: {
        label: "Failed",
        tone: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
        icon: XCircle,
    },
    refunded: {
        label: "Refunded",
        tone: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
        icon: Undo2,
    },
};

function providerLabel(provider: AdminMatchPaymentRow["provider"]) {
    if (provider === "revenuecat") return "App store";
    if (provider === "credit") return "Credit";
    return "Manual";
}
