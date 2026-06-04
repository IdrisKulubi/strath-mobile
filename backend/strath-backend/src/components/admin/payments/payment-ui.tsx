import type { AdminPaymentQueueKey } from "@/lib/actions/admin-payments";

export function formatKes(cents: number, currency = "KES") {
    const amount = cents / 100;
    if (currency === "KES") {
        return `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
    }
    return `${currency} ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

export function formatAdminDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-KE", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export const PAYMENT_STATE_STYLES: Record<string, string> = {
    awaiting_payment: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
    paid_waiting_for_other: "bg-sky-500/15 text-sky-200 ring-sky-500/25",
    both_paid: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
    expired: "bg-white/10 text-gray-300 ring-white/15",
    not_required: "bg-white/8 text-gray-400 ring-white/10",
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
    none: "bg-white/8 text-gray-400 ring-white/10",
    pending: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
    paid: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
    failed: "bg-red-500/15 text-red-300 ring-red-500/25",
    refund_requested: "bg-orange-500/15 text-orange-200 ring-orange-500/25",
    refunded: "bg-white/10 text-gray-300 ring-white/15",
    credited: "bg-purple-500/15 text-purple-200 ring-purple-500/25",
    cancelled: "bg-white/10 text-gray-400 ring-white/10",
};

export const QUEUE_FILTERS: { value: AdminPaymentQueueKey; label: string; description: string }[] = [
    { value: "all", label: "All", description: "Every active payment match" },
    {
        value: "awaiting_payment",
        label: "Awaiting payment",
        description: "Neither user has paid yet",
    },
    {
        value: "one_paid",
        label: "One paid",
        description: "At risk if the other user does not pay in time",
    },
    {
        value: "both_paid",
        label: "Both paid",
        description: "Ready to arrange or already finalized",
    },
    {
        value: "expired_with_credit",
        label: "Expired + credit",
        description: "One-sided pay converted to credit",
    },
    {
        value: "refund_requested",
        label: "Refund pending",
        description: "Paystack refund in flight",
    },
];

export function StatusBadge({
    label,
    className,
}: {
    label: string;
    className: string;
}) {
    return (
        <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${className}`}
        >
            {label.replace(/_/g, " ")}
        </span>
    );
}
