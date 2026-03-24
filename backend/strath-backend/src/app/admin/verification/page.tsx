import { requireAdmin } from "@/lib/admin-auth";
import { getFaceVerificationAdminOverview } from "@/lib/services/face-verification-admin";

import {
    processVerificationSessionAction,
    reviewVerificationSessionAction,
} from "./_actions";

function MetricCard({
    label,
    value,
    hint,
}: {
    label: string;
    value: number | string;
    hint?: string;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const tones: Record<string, string> = {
        processing: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        manual_review: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
        retry_required: "bg-orange-500/15 text-orange-300 border-orange-500/30",
        failed: "bg-red-500/15 text-red-300 border-red-500/30",
        verified: "bg-green-500/15 text-green-300 border-green-500/30",
        blocked: "bg-red-600/15 text-red-200 border-red-600/30",
        pending_capture: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    };

    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${tones[status] ?? "bg-white/10 text-gray-300 border-white/10"}`}>
            {status.replace(/_/g, " ")}
        </span>
    );
}

export default async function AdminVerificationPage() {
    await requireAdmin();
    const overview = await getFaceVerificationAdminOverview(20);

    return (
        <div className="space-y-8 p-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Face Verification</h1>
                <p className="mt-1 text-sm text-gray-400">
                    Review stuck sessions, manual-review cases, and processor health.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard
                    label="Queue Depth"
                    value={overview.totals.queueDepth}
                    hint={`Batch size ${overview.configuration.cronBatchSize}`}
                />
                <MetricCard
                    label="Stale Processing"
                    value={overview.totals.staleProcessing}
                    hint="Expired jobs needing cleanup"
                />
                <MetricCard
                    label="Attention Required"
                    value={overview.totals.attentionRequired}
                    hint="Retry, manual review, failed"
                />
                <MetricCard
                    label="Completed 24h"
                    value={overview.performance.completedLast24Hours}
                    hint={overview.performance.avgDurationSeconds
                        ? `Avg ${overview.performance.avgDurationSeconds}s`
                        : "No completed runs yet"}
                />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Attention Queue
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        Sessions that need human action or operational follow-up.
                    </p>
                </div>

                {overview.attentionSessions.length === 0 ? (
                    <p className="text-sm text-gray-400">No sessions currently need review.</p>
                ) : (
                    <div className="space-y-4">
                        {overview.attentionSessions.map((session) => (
                            <div
                                key={session.sessionId}
                                className="rounded-xl border border-white/10 bg-black/20 p-4"
                            >
                                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={session.status} />
                                            <span className="text-xs text-gray-500">
                                                Attempt {session.attemptNumber}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{session.displayName}</p>
                                            <p className="text-sm text-gray-400">{session.email}</p>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            <p>Session: {session.sessionId}</p>
                                            <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
                                            <p>Expires: {new Date(session.expiresAt).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="max-w-md text-xs text-gray-400">
                                        {session.failureReasons?.length > 0 ? (
                                            <p>Reasons: {session.failureReasons.join(", ")}</p>
                                        ) : (
                                            <p>No failure reasons recorded yet.</p>
                                        )}
                                        {session.isExpiredProcessing ? (
                                            <p className="mt-2 text-yellow-300">This processing session has expired.</p>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <form action={processVerificationSessionAction}>
                                        <input type="hidden" name="sessionId" value={session.sessionId} />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-blue-500/30 bg-blue-500/15 px-3 py-2 text-xs font-medium text-blue-200 hover:bg-blue-500/25"
                                        >
                                            Reprocess
                                        </button>
                                    </form>

                                    <form action={reviewVerificationSessionAction}>
                                        <input type="hidden" name="sessionId" value={session.sessionId} />
                                        <input type="hidden" name="status" value="verified" />
                                        <input type="hidden" name="reason" value="admin_verified_after_review" />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-green-500/30 bg-green-500/15 px-3 py-2 text-xs font-medium text-green-200 hover:bg-green-500/25"
                                        >
                                            Approve
                                        </button>
                                    </form>

                                    <form action={reviewVerificationSessionAction}>
                                        <input type="hidden" name="sessionId" value={session.sessionId} />
                                        <input type="hidden" name="status" value="failed" />
                                        <input type="hidden" name="reason" value="admin_failed_after_review" />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/25"
                                        >
                                            Fail
                                        </button>
                                    </form>

                                    <form action={reviewVerificationSessionAction}>
                                        <input type="hidden" name="sessionId" value={session.sessionId} />
                                        <input type="hidden" name="status" value="blocked" />
                                        <input type="hidden" name="reason" value="admin_blocked_account_review" />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-red-700/30 bg-red-700/15 px-3 py-2 text-xs font-medium text-red-100 hover:bg-red-700/25"
                                        >
                                            Block
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Recent Processed Sessions
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-gray-500">
                                <th className="px-3 py-3">User</th>
                                <th className="px-3 py-3">Status</th>
                                <th className="px-3 py-3">Attempt</th>
                                <th className="px-3 py-3">Duration</th>
                                <th className="px-3 py-3">Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overview.recentProcessedSessions.map((session) => (
                                <tr key={session.sessionId} className="border-b border-white/5 last:border-0">
                                    <td className="px-3 py-3">
                                        <div>
                                            <p className="font-medium text-white">{session.displayName}</p>
                                            <p className="text-xs text-gray-500">{session.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <StatusBadge status={session.status} />
                                    </td>
                                    <td className="px-3 py-3 text-gray-300">{session.attemptNumber}</td>
                                    <td className="px-3 py-3 text-gray-300">
                                        {session.durationSeconds ?? "-"}
                                    </td>
                                    <td className="px-3 py-3 text-gray-400">
                                        {new Date(session.updatedAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
