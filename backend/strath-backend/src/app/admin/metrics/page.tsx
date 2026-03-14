import { getAdminMetrics, getAdminTimeSeries } from "@/lib/actions/admin";
import { MetricsChart } from "./_chart";

function FunnelStep({
    label,
    value,
    total,
    color,
    rate,
}: {
    label: string;
    value: number;
    total: number;
    color: string;
    rate?: string;
}) {
    const pct = total > 0 ? Math.max(2, Math.round((value / total) * 100)) : 2;
    return (
        <div>
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    {rate && <p className="text-xs text-gray-500">{rate}</p>}
                </div>
                <div className="text-right">
                    <span className="text-xl font-bold text-white">{value.toLocaleString()}</span>
                </div>
            </div>
            <div className="h-3 bg-white/8 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default async function AdminMetricsPage() {
    const [metrics, timeSeries] = await Promise.all([
        getAdminMetrics(),
        getAdminTimeSeries(30),
    ]);

    const funnelSteps = [
        {
            label: "Profiles created",
            value: metrics.totalUsers,
            color: "bg-purple-500",
            rate: "Total signups with complete profile",
        },
        {
            label: "Date requests sent",
            value: metrics.totalRequestsAllTime,
            color: "bg-indigo-500",
            rate: `${metrics.requestsToday} today`,
        },
        {
            label: "Requests accepted",
            value: metrics.totalAccepted,
            color: "bg-blue-500",
            rate: `${metrics.acceptanceRate}% acceptance rate`,
        },
        {
            label: "Dates scheduled",
            value: metrics.scheduled + metrics.attended,
            color: "bg-cyan-500",
            rate: `${metrics.pendingSetup} pending setup`,
        },
        {
            label: "Dates attended",
            value: metrics.attended,
            color: "bg-green-500",
            rate: `${metrics.attendanceRate}% attendance rate`,
        },
        {
            label: "Second dates",
            value: metrics.secondDates,
            color: "bg-pink-500",
            rate: `${metrics.totalFeedback} feedbacks submitted`,
        },
    ];

    const base = metrics.totalUsers || 1;

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Metrics & Analytics</h1>
                <p className="text-sm text-gray-400 mt-1">Funnel performance and 30-day activity</p>
            </div>

            {/* Time-series chart */}
            <MetricsChart data={timeSeries} />

            {/* Funnel */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                    Conversion Funnel
                </h2>
                {funnelSteps.map((step) => (
                    <FunnelStep key={step.label} {...step} total={base} />
                ))}
            </div>

            {/* Conversion table */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                        Conversion Rates
                    </h2>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/8">
                            <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Step</th>
                            <th className="text-right px-6 py-3 text-xs text-gray-400 font-medium">Count</th>
                            <th className="text-right px-6 py-3 text-xs text-gray-400 font-medium">vs Requests</th>
                            <th className="text-right px-6 py-3 text-xs text-gray-400 font-medium">Target</th>
                            <th className="text-right px-6 py-3 text-xs text-gray-400 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            {
                                step: "Acceptance rate",
                                count: metrics.totalAccepted,
                                base: metrics.totalRequestsAllTime,
                                target: 30,
                            },
                            {
                                step: "Scheduled (of accepted)",
                                count: metrics.scheduled + metrics.attended,
                                base: metrics.totalAccepted,
                                target: 60,
                            },
                            {
                                step: "Attendance rate",
                                count: metrics.attended,
                                base: metrics.scheduled + metrics.attended,
                                target: 70,
                            },
                            {
                                step: "Second date rate",
                                count: metrics.secondDates,
                                base: metrics.attended,
                                target: 40,
                            },
                        ].map((row, i) => {
                            const rate = row.base > 0 ? Math.round((row.count / row.base) * 100) : 0;
                            const onTarget = rate >= row.target;
                            return (
                                <tr key={row.step} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                                    <td className="px-6 py-3 text-gray-300">{row.step}</td>
                                    <td className="px-6 py-3 text-right text-white font-medium">{row.count}</td>
                                    <td className="px-6 py-3 text-right">
                                        <span className={`font-bold ${onTarget ? "text-green-400" : rate > 0 ? "text-yellow-400" : "text-gray-500"}`}>
                                            {rate}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right text-gray-500">&gt;{row.target}%</td>
                                    <td className="px-6 py-3 text-right">
                                        {rate === 0 ? (
                                            <span className="text-gray-600 text-xs">No data</span>
                                        ) : onTarget ? (
                                            <span className="text-green-400 text-xs font-medium">✓ On target</span>
                                        ) : (
                                            <span className="text-yellow-400 text-xs font-medium">↑ Below target</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
