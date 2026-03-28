import { getAdminMetrics, getAdminPendingDates } from "@/lib/actions/admin";

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
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-3xl font-bold ${accent ?? "text-white"}`}>{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    );
}

export default async function AdminOverviewPage() {
    const [metrics, pending] = await Promise.all([
        getAdminMetrics(),
        getAdminPendingDates(),
    ]);

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Overview</h1>
                <p className="text-sm text-gray-400 mt-1">Live stats across the platform</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                <MetricCard
                    label="Second Dates"
                    value={metrics.secondDates}
                    accent="text-pink-400"
                    sub={`${metrics.totalFeedback} feedbacks`}
                />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-5">Conversion Funnel</h2>
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
                            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                                <span>{step.label}</span>
                                <span className="text-white font-medium">{step.value}</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className={`h-full ${step.color} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {pending.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                    <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide mb-4">
                        {pending.length} agreed pair{pending.length > 1 ? "s" : ""} need scheduling
                    </h2>
                    <div className="space-y-3">
                        {pending.slice(0, 5).map((dm) => (
                            <div key={dm.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-white">
                                        {dm.userA.firstName} × {dm.userB.firstName}
                                    </span>
                                    <span className="text-xs text-gray-500 capitalize">{dm.vibe}</span>
                                </div>
                                <a
                                    href="/admin/pending-dates"
                                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
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
