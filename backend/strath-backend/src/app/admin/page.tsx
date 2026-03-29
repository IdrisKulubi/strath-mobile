import { getAdminMetrics, getAdminOnCallSessions, getAdminPendingDates } from "@/lib/actions/admin";

function MetricCard({
    label,
    value,
    sub,
    accent,
}: {
    label: string;
    value: number | string;
    sub?: string;
    accent?: string;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className={`text-3xl font-bold ${accent ?? "text-white"}`}>{value}</p>
            {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
        </div>
    );
}

export default async function AdminOverviewPage() {
    const [metrics, pending, onCall] = await Promise.all([
        getAdminMetrics(),
        getAdminPendingDates(),
        getAdminOnCallSessions(),
    ]);

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Overview</h1>
                <p className="mt-1 text-sm text-gray-400">Live stats across the platform</p>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard label="Total Users" value={metrics.totalUsers} />
                <MetricCard label="Requests Today" value={metrics.requestsToday} accent="text-purple-300" />
                <MetricCard label="All-time Requests" value={metrics.totalRequestsAllTime} />
                <MetricCard
                    label="Acceptance Rate"
                    value={`${metrics.acceptanceRate}%`}
                    accent="text-green-400"
                    sub={`${metrics.totalAccepted} accepted`}
                />
                <MetricCard
                    label="On Call"
                    value={metrics.onCall}
                    accent={metrics.onCall > 0 ? "text-cyan-300" : "text-white"}
                    sub="pending, joining, or active vibe checks"
                />
                <MetricCard
                    label="Arranging"
                    value={metrics.pendingSetup}
                    accent={metrics.pendingSetup > 0 ? "text-yellow-400" : "text-white"}
                    sub="agreed pairs awaiting setup"
                />
                <MetricCard label="Scheduled" value={metrics.scheduled} accent="text-blue-400" />
                <MetricCard
                    label="Attended"
                    value={metrics.attended}
                    accent="text-green-400"
                    sub={`${metrics.attendanceRate}% attendance`}
                />
            </div>

            <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-300">Conversion Funnel</h2>
                {[
                    { label: "Requests sent", value: metrics.totalRequestsAllTime, color: "bg-purple-500" },
                    { label: "Accepted", value: metrics.totalAccepted, color: "bg-blue-500" },
                    { label: "Attended", value: metrics.attended, color: "bg-green-500" },
                    { label: "Second dates", value: metrics.secondDates, color: "bg-pink-500" },
                ].map((step) => {
                    const pct = metrics.totalRequestsAllTime > 0
                        ? Math.max(4, Math.round((step.value / metrics.totalRequestsAllTime) * 100))
                        : 4;

                    return (
                        <div key={step.label} className="mb-4 last:mb-0">
                            <div className="mb-1.5 flex justify-between text-xs text-gray-400">
                                <span>{step.label}</span>
                                <span className="font-medium text-white">{step.value}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div className={`h-full rounded-full ${step.color}`} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {onCall.length > 0 && (
                <div className="mb-8 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                            {onCall.length} vibe check{onCall.length > 1 ? "s" : ""} in call flow
                        </h2>
                        <a href="/admin/on-call" className="text-xs text-cyan-200 transition-colors hover:text-white">
                            Open on-call queue →
                        </a>
                    </div>
                    <div className="space-y-3">
                        {onCall.slice(0, 5).map((session) => (
                            <div key={session.id} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-white">
                                        {session.userA.firstName} × {session.userB.firstName}
                                    </span>
                                    <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                                        {session.status}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {session.startedAt
                                        ? `Started ${new Date(session.startedAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`
                                        : session.scheduledAt
                                        ? `Invited ${new Date(session.scheduledAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`
                                        : "Waiting"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {pending.length > 0 && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-yellow-400">
                        {pending.length} agreed pair{pending.length > 1 ? "s" : ""} need scheduling
                    </h2>
                    <div className="space-y-3">
                        {pending.slice(0, 5).map((dm) => (
                            <div key={dm.id} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-white">
                                        {dm.userA.firstName} × {dm.userB.firstName}
                                    </span>
                                    <span className="text-xs capitalize text-gray-500">{dm.vibe}</span>
                                </div>
                                <a
                                    href="/admin/pending-dates"
                                    className="text-xs text-purple-400 transition-colors hover:text-purple-300"
                                >
                                    Arrange →
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
