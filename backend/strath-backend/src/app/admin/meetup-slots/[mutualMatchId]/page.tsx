import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { getAdminMeetupRescheduleDetail } from "@/lib/actions/admin-meetup-reschedule";

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-200",
    accepted: "bg-emerald-500/20 text-emerald-300",
    declined: "bg-orange-500/20 text-orange-200",
    superseded: "bg-white/10 text-gray-400",
    cancelled: "bg-gray-500/20 text-gray-300",
};

function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-KE", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default async function AdminMeetupRescheduleDetailPage({
    params,
}: {
    params: Promise<{ mutualMatchId: string }>;
}) {
    const { mutualMatchId } = await params;
    const detail = await getAdminMeetupRescheduleDetail(mutualMatchId);

    if (!detail) {
        notFound();
    }

    return (
        <div className="p-8">
            <Link
                href="/admin/meetup-slots"
                className="mb-5 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
                <ArrowLeft className="size-4" />
                Back to meetup slots
            </Link>

            <div className="mb-6 flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-300">
                    <CalendarClock className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-bold text-white">
                        {detail.userA.firstName} × {detail.userB.firstName}
                    </h1>
                    <p className="mt-1 font-mono text-xs text-gray-500">{detail.mutualMatchId}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-400">
                        <span className="capitalize">Match: {detail.status.replace(/_/g, " ")}</span>
                        {detail.scheduledAtLabel ? (
                            <span>· Current slot: {detail.scheduledAtLabel}</span>
                        ) : null}
                        {detail.pendingRescheduleRequestId ? (
                            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200">
                                Pending reschedule
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>

            <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Reschedule history ({detail.requests.length})
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                    Partner-initiated date change requests for this mutual match (read-only).
                </p>

                {detail.requests.length === 0 ? (
                    <p className="mt-6 text-center text-sm text-gray-500">No reschedule requests yet.</p>
                ) : (
                    <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                                        By
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                                        Proposed
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                                        Reason
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                                        Created
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                                        Responded
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.requests.map((row, index) => (
                                    <tr
                                        key={row.id}
                                        className={`border-b border-white/5 last:border-0 ${index % 2 === 0 ? "" : "bg-white/2"}`}
                                    >
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${STATUS_STYLES[row.status] ?? STATUS_STYLES.superseded}`}
                                            >
                                                {row.status}
                                            </span>
                                            {row.counterOfRequestId ? (
                                                <div className="mt-1 font-mono text-[10px] text-gray-600">
                                                    counter
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white">
                                                {row.requestedBy.name || row.requestedBy.firstName}
                                            </div>
                                            {row.requestedBy.email ? (
                                                <div className="max-w-[180px] truncate text-xs text-gray-500">
                                                    {row.requestedBy.email}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-300">
                                            <div className="font-medium text-white">
                                                {row.proposedScheduledAtLabel}
                                            </div>
                                            <div className="mt-0.5 capitalize text-gray-500">
                                                {row.proposedSlot}
                                            </div>
                                            <div className="mt-1 text-gray-500">
                                                Confirm by {formatDate(row.proposedConfirmBy)}
                                            </div>
                                        </td>
                                        <td className="max-w-[220px] px-4 py-3 text-xs text-gray-400">
                                            {row.declineReason ? (
                                                <span className="italic">&ldquo;{row.declineReason}&rdquo;</span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {formatDate(row.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {formatDate(row.respondedAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
