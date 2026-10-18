import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";

import { getAdminPaymentsForDateMatch } from "@/lib/actions/admin-payments";
import {
    formatAdminDate,
    formatKes,
    PAYMENT_STATE_STYLES,
    PAYMENT_STATUS_STYLES,
    StatusBadge,
} from "@/components/admin/payments/payment-ui";
import { PaymentAdminActions } from "../_actions";

export default async function AdminPaymentDetailPage({
    params,
}: {
    params: Promise<{ dateMatchId: string }>;
}) {
    const { dateMatchId } = await params;
    const detail = await getAdminPaymentsForDateMatch(dateMatchId);

    if (!detail) {
        notFound();
    }

    return (
        <div className="p-8">
            <Link
                href="/admin/payments"
                className="mb-5 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
            >
                <ArrowLeft className="size-4" strokeWidth={1.75} />
                Back to payments
            </Link>

            <div className="mb-6 flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#B8327A]/20 text-[#D94A8F]">
                    <Wallet className="size-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-white">
                        {detail.userA.firstName} × {detail.userB.firstName}
                    </h1>
                    <p className="mt-1 font-mono text-[11px] text-white/35">{detail.dateMatchId}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge
                            label={detail.paymentState}
                            className={
                                PAYMENT_STATE_STYLES[detail.paymentState] ??
                                PAYMENT_STATE_STYLES.not_required
                            }
                        />
                        <span className="text-[12px] text-white/40">
                            {formatKes(detail.paymentAmountCents, detail.paymentCurrency)} setup
                            fee
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                    <section className="rounded-xl border border-white/[0.08] bg-[#221C2A]/50 p-5 ring-1 ring-inset ring-white/[0.04]">
                        <h2 className="text-sm font-semibold text-white">Match summary</h2>
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                                <dt className="text-[11px] font-medium text-white/40">Due by</dt>
                                <dd className="mt-0.5 text-sm text-white/80">
                                    {formatAdminDate(detail.paymentDueBy)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-medium text-white/40">Scheduled</dt>
                                <dd className="mt-0.5 text-sm text-white/80">
                                    {formatAdminDate(detail.scheduledAt)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-medium text-white/40">Date status</dt>
                                <dd className="mt-0.5 text-sm capitalize text-white/80">
                                    {detail.matchStatus.replace(/_/g, " ")}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-medium text-white/40">Paid count</dt>
                                <dd className="mt-0.5 text-sm text-white/80">
                                    {detail.paidUserCount} / 2
                                </dd>
                            </div>
                            {detail.mutualMatchId ? (
                                <>
                                    <div className="sm:col-span-2">
                                        <dt className="text-[11px] font-medium text-white/40">
                                            Mutual match
                                        </dt>
                                        <dd className="mt-0.5 space-y-1">
                                            <span className="font-mono text-[11px] text-white/50">
                                                {detail.mutualMatchId}
                                                {detail.mutualStatus
                                                    ? ` · ${detail.mutualStatus.replace(/_/g, " ")}`
                                                    : ""}
                                            </span>
                                            <div>
                                                <Link
                                                    href={`/admin/meetup-slots/${detail.mutualMatchId}`}
                                                    className="text-xs font-medium text-pink-300 hover:text-pink-200"
                                                >
                                                    Reschedule history
                                                </Link>
                                            </div>
                                        </dd>
                                    </div>
                                </>
                            ) : null}
                        </dl>
                    </section>

                    <section className="rounded-xl border border-white/[0.08] bg-[#221C2A]/50 ring-1 ring-inset ring-white/[0.04]">
                        <h2 className="border-b border-white/[0.06] px-5 py-3 text-sm font-semibold text-white">
                            Payments
                        </h2>
                        <div className="divide-y divide-white/[0.04]">
                            {detail.participants.map((row) => (
                                <div key={row.userId} className="px-5 py-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-white">
                                                {row.user.name || row.user.firstName}
                                            </p>
                                            <p className="text-[11px] text-white/40">
                                                {row.user.email ?? "No email"}
                                                {row.user.lowIntentScore > 0
                                                    ? ` · Low intent ${row.user.lowIntentScore}`
                                                    : ""}
                                            </p>
                                        </div>
                                        <StatusBadge
                                            label={row.status}
                                            className={
                                                PAYMENT_STATUS_STYLES[row.status] ??
                                                PAYMENT_STATUS_STYLES.none
                                            }
                                        />
                                    </div>
                                    <dl className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2">
                                        <div>
                                            <dt className="text-white/35">Amount</dt>
                                            <dd className="text-white/75">
                                                {formatKes(row.amountCents, row.currency)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-white/35">Provider</dt>
                                            <dd className="capitalize text-white/75">
                                                {row.provider ?? "—"}
                                            </dd>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <dt className="text-white/35">Paystack reference</dt>
                                            <dd className="break-all font-mono text-[11px] text-white/60">
                                                {row.paystackReference ?? "—"}
                                            </dd>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <dt className="text-white/35">Transaction id</dt>
                                            <dd className="break-all font-mono text-[11px] text-white/60">
                                                {row.paystackTransactionId ?? "—"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-white/35">Paid at</dt>
                                            <dd className="text-white/75">
                                                {formatAdminDate(row.paidAt)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-white/35">Refunded / credited</dt>
                                            <dd className="text-white/75">
                                                {formatAdminDate(row.refundedAt)}
                                                {row.creditedAt
                                                    ? ` / ${formatAdminDate(row.creditedAt)}`
                                                    : ""}
                                            </dd>
                                        </div>
                                        {row.refundReason ? (
                                            <div className="sm:col-span-2">
                                                <dt className="text-white/35">Refund reason</dt>
                                                <dd className="text-white/75">{row.refundReason}</dd>
                                            </div>
                                        ) : null}
                                    </dl>
                                </div>
                            ))}
                        </div>
                    </section>

                    {detail.credits.length > 0 ? (
                        <section className="rounded-xl border border-white/[0.08] bg-[#221C2A]/50 ring-1 ring-inset ring-white/[0.04]">
                            <h2 className="border-b border-white/[0.06] px-5 py-3 text-sm font-semibold text-white">
                                Credits
                            </h2>
                            <ul className="divide-y divide-white/[0.04]">
                                {detail.credits.map((credit) => (
                                    <li key={credit.id} className="px-5 py-3 text-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-white/80">
                                                {credit.user.firstName} ·{" "}
                                                {formatKes(credit.amountCents, credit.currency)}
                                            </span>
                                            <StatusBadge
                                                label={credit.status}
                                                className="bg-purple-500/15 text-purple-200 ring-purple-500/25"
                                            />
                                        </div>
                                        <p className="mt-1 text-[11px] text-white/40">
                                            {credit.reason} · {formatAdminDate(credit.createdAt)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    {detail.paymentAdminNotes ? (
                        <section className="rounded-xl border border-white/[0.08] bg-[#221C2A]/50 p-5 ring-1 ring-inset ring-white/[0.04]">
                            <h2 className="text-sm font-semibold text-white">Internal notes</h2>
                            <pre className="mt-3 whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-white/55">
                                {detail.paymentAdminNotes}
                            </pre>
                        </section>
                    ) : null}
                </div>

                <aside>
                    <PaymentAdminActions
                        dateMatchId={detail.dateMatchId}
                        participants={detail.participants}
                    />
                </aside>
            </div>
        </div>
    );
}
