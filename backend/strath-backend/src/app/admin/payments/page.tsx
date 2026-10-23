import Link from "next/link";
import { Wallet } from "lucide-react";

import {
    getAdminPaymentQueues,
    type AdminPaymentQueueKey,
} from "@/lib/actions/admin-payments";
import {
    formatAdminDate,
    formatKes,
    PAYMENT_STATE_STYLES,
    QUEUE_FILTERS,
    StatusBadge,
} from "@/components/admin/payments/payment-ui";

function Stat({
    label,
    value,
    sub,
}: {
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="rounded-xl border border-white/[0.08] bg-[#221C2A]/60 p-4 ring-1 ring-inset ring-white/[0.04]">
            <p className="text-[12px] font-medium text-white/45">{label}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-white">{value}</p>
            {sub ? <p className="mt-1 text-[11px] text-white/35">{sub}</p> : null}
        </div>
    );
}

function UserMini({
    user,
}: {
    user: { firstName: string; name: string; email: string | null };
}) {
    return (
        <div>
            <p className="font-medium text-white">{user.name || user.firstName}</p>
            {user.email ? (
                <p className="max-w-[200px] truncate text-[11px] text-white/40">{user.email}</p>
            ) : null}
        </div>
    );
}

export default async function AdminPaymentsPage({
    searchParams,
}: {
    searchParams: Promise<{ queue?: string }>;
}) {
    const { queue } = await searchParams;
    const filter = (
        QUEUE_FILTERS.some((f) => f.value === queue) ? queue : "all"
    ) as AdminPaymentQueueKey;

    const { rows, reconciliation, counts, filter: activeFilter } =
        await getAdminPaymentQueues(filter);

    const activeMeta = QUEUE_FILTERS.find((f) => f.value === activeFilter);

    return (
        <div className="p-8">
            <div className="mb-6 flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#B8327A]/20 text-[#D94A8F]">
                    <Wallet className="size-5" strokeWidth={1.75} />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Payments</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">
                        Track pay-to-confirm matches, refunds, and credits. Open a match for
                        references, notes, and manual ops actions.
                    </p>
                </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                    label="Collected (paid)"
                    value={formatKes(reconciliation.collectedCents)}
                />
                <Stat
                    label="Active credits"
                    value={formatKes(reconciliation.activeCreditsCents)}
                />
                <Stat
                    label="Refunds pending"
                    value={String(reconciliation.refundsPending)}
                    sub="Awaiting Paystack"
                />
                <Stat
                    label="Refunds completed"
                    value={String(reconciliation.refundsCompleted)}
                />
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
                {QUEUE_FILTERS.map((item) => {
                    const count =
                        item.value === "all"
                            ? Object.values(counts).reduce((a, b) => a + b, 0)
                            : counts[item.value as keyof typeof counts];

                    return (
                        <Link
                            key={item.value}
                            href={
                                item.value === "all"
                                    ? "/admin/payments"
                                    : `/admin/payments?queue=${item.value}`
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                activeFilter === item.value
                                    ? "bg-[#B8327A] text-white"
                                    : "bg-white/[0.06] text-white/45 hover:bg-white/[0.1] hover:text-white"
                            }`}
                        >
                            {item.label}
                            {item.value !== "all" ? ` (${count})` : ""}
                        </Link>
                    );
                })}
            </div>

            {activeMeta && activeFilter !== "all" ? (
                <p className="mb-4 text-sm text-white/45">{activeMeta.description}</p>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#221C2A]/40 ring-1 ring-inset ring-white/[0.04]">
                {rows.length === 0 ? (
                    <div className="p-12 text-center text-sm text-white/40">
                        No matches in this queue
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-white/40">
                                    Match
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-white/40">
                                    Payment state
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-white/40">
                                    Due by
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium text-white/40">
                                    Paid
                                </th>
                                <th className="px-4 py-3 text-right text-[11px] font-medium text-white/40">
                                    Detail
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr
                                    key={row.dateMatchId}
                                    className={`border-b border-white/[0.04] last:border-0 ${index % 2 === 1 ? "bg-white/[0.02]" : ""}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                                            <UserMini user={row.userA} />
                                            <UserMini user={row.userB} />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge
                                            label={row.paymentState}
                                            className={
                                                PAYMENT_STATE_STYLES[row.paymentState] ??
                                                PAYMENT_STATE_STYLES.not_required
                                            }
                                        />
                                        <p className="mt-1 text-[11px] capitalize text-white/35">
                                            {row.matchStatus.replace(/_/g, " ")}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-white/50">
                                        {formatAdminDate(row.paymentDueBy)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-white/60">
                                        {row.paidUserCount} / 2
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={`/admin/payments/${row.dateMatchId}`}
                                            className="inline-flex rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.1] hover:text-white"
                                        >
                                            Open
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
