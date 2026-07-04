import Link from "next/link";

import { getAdminProfileIntelligenceOverview } from "@/lib/actions/admin";

function MetricCard({
    label,
    value,
    hint,
    accent,
}: {
    label: string;
    value: number | string;
    hint?: string;
    accent?: string;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className={`text-3xl font-bold ${accent ?? "text-white"}`}>{value}</p>
            {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
        </div>
    );
}

function StatusBadge({ status }: { status: "healthy" | "warning" | "critical" }) {
    const tones = {
        healthy: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        warning: "border-amber-500/30 bg-amber-500/15 text-amber-200",
        critical: "border-red-500/30 bg-red-500/15 text-red-200",
    };

    return (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tones[status]}`}>
            {status}
        </span>
    );
}

function AlertList({
    alerts,
}: {
    alerts: Array<{ severity: "info" | "warning" | "critical"; message: string }>;
}) {
    if (alerts.length === 0) {
        return <p className="text-sm text-emerald-300">Profile intelligence coverage and ranking health look good.</p>;
    }

    const tones = {
        info: "border-sky-500/20 bg-sky-500/10 text-sky-200",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-200",
        critical: "border-red-500/20 bg-red-500/10 text-red-200",
    };

    return (
        <div className="space-y-2">
            {alerts.map((alert) => (
                <p key={alert.message} className={`rounded-lg border px-3 py-2 text-sm ${tones[alert.severity]}`}>
                    {alert.message}
                </p>
            ))}
        </div>
    );
}

export default async function AdminProfileIntelligencePage() {
    const overview = await getAdminProfileIntelligenceOverview();

    return (
        <div className="space-y-8 p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Profile Intelligence</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-400">
                        Coverage, freshness, ranking health, and matchmaker search signals for the profile-intelligence backend.
                    </p>
                </div>
                <StatusBadge status={overview.systemStatus} />
            </div>

            <section className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">System status</h2>
                <div className="mt-4">
                    <AlertList alerts={overview.alerts} />
                </div>
            </section>

            <section>
                <div className="mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Coverage</h2>
                    <p className="mt-1 text-sm text-gray-500">Is every eligible profile searchable by the matchmaker?</p>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
                    <MetricCard
                        label="Coverage"
                        value={`${overview.coverage.coveragePct}%`}
                        hint={`${overview.coverage.intelligenceRecords} of ${overview.coverage.eligibleProfiles}`}
                        accent="text-pink-300"
                    />
                    <MetricCard
                        label="Stale"
                        value={`${overview.coverage.stalePct}%`}
                        hint={`${overview.coverage.staleRecords} records`}
                        accent={overview.coverage.stalePct >= 10 ? "text-amber-300" : "text-white"}
                    />
                    <MetricCard label="Failed jobs" value={overview.coverage.failedJobs} accent={overview.coverage.failedJobs > 0 ? "text-red-300" : "text-white"} />
                    <MetricCard label="Pending jobs" value={overview.coverage.pendingJobs} />
                    <MetricCard label="Avg strength" value={overview.coverage.avgCandidateStrength} />
                    <MetricCard label="Matchmaker 7d" value={overview.coverage.matchmakerRequests7d} accent="text-cyan-300" />
                </div>
            </section>

            <section>
                <div className="mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Daily recommendations</h2>
                    <p className="mt-1 text-sm text-gray-500">Nairobi day {overview.dailyRecommendations.shortlistDay}.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
                    <MetricCard label="Viewers" value={overview.dailyRecommendations.viewersWithShortlist} />
                    <MetricCard label="Active shown" value={overview.dailyRecommendations.activeUsersShown} accent="text-emerald-300" />
                    <MetricCard label="Dormant shown" value={overview.dailyRecommendations.dormantUsersShown} accent={overview.dailyRecommendations.dormantUsersShown > 0 ? "text-amber-300" : "text-white"} />
                    <MetricCard label="Decision rate" value={`${overview.dailyRecommendations.decisionRatePct}%`} />
                    <MetricCard label="Open rate" value={`${overview.dailyRecommendations.openToMeetRatePct}%`} accent="text-pink-300" />
                    <MetricCard label="Waiting likes" value={overview.dailyRecommendations.incomingInterestWaitingCount} accent="text-cyan-300" />
                </div>
            </section>

            <section>
                <div className="mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Matchmaker quality</h2>
                    <p className="mt-1 text-sm text-gray-500">Last 7 days of conversation-driven search.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
                    <MetricCard label="Sessions" value={overview.matchmakerQuality.sessions7d} />
                    <MetricCard label="Searches" value={overview.matchmakerQuality.searches7d} accent="text-cyan-300" />
                    <MetricCard label="Repeat rate" value={`${overview.matchmakerQuality.repeatedCandidateRatePct}%`} accent={overview.matchmakerQuality.repeatedCandidateRatePct > 25 ? "text-amber-300" : "text-white"} />
                    <MetricCard label="Interested rate" value={`${overview.matchmakerQuality.interestedRatePct}%`} accent="text-pink-300" />
                    <MetricCard label="Pass rate" value={`${overview.matchmakerQuality.passRatePct}%`} />
                    <MetricCard label="Mutual creation" value={`${overview.matchmakerQuality.mutualMatchCreationRatePct}%`} accent="text-emerald-300" />
                    <MetricCard label="Avg clarifiers" value={overview.matchmakerQuality.averageClarifyingTurns} />
                    <MetricCard label="LLM fallback" value={`${overview.matchmakerQuality.llmFallbackRatePct}%`} accent={overview.matchmakerQuality.llmFallbackRatePct > 10 ? "text-amber-300" : "text-white"} />
                    <MetricCard label="Feedback reasons" value={overview.matchmakerQuality.feedbackReasons7d} />
                    <MetricCard label="Quota reached" value={overview.matchmakerQuality.quotaReached7d} />
                </div>
            </section>

            <section>
                <div className="mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">30-day outcomes</h2>
                    <p className="mt-1 text-sm text-gray-500">Useful for tuning ranking after launch.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    <MetricCard label="Decisions" value={overview.rolling30d.decisions} />
                    <MetricCard label="Open to meet" value={overview.rolling30d.openToMeetCount} accent="text-pink-300" />
                    <MetricCard label="Open rate" value={`${overview.rolling30d.openToMeetRatePct}%`} />
                    <MetricCard label="Mutual rate" value={`${overview.rolling30d.reciprocalMatchRatePct}%`} accent="text-emerald-300" />
                    <MetricCard
                        label="Time to mutual"
                        value={overview.rolling30d.averageTimeToFirstMutualHours == null ? "-" : `${overview.rolling30d.averageTimeToFirstMutualHours}h`}
                    />
                </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Tuning</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg bg-black/20 px-4 py-3 text-sm text-gray-300">
                        Mode: <span className="text-white">{overview.tuning.scoringMode}</span>
                    </div>
                    <div className="rounded-lg bg-black/20 px-4 py-3 text-sm text-gray-300">
                        Ranking enabled: <span className="text-white">{overview.tuning.profileIntelligenceWeightEnabled ? "yes" : "no"}</span>
                    </div>
                    <div className="rounded-lg bg-black/20 px-4 py-3 text-sm text-gray-300">
                        Stale after: <span className="text-white">{overview.tuning.staleAfterDays} days</span>
                    </div>
                    <div className="rounded-lg bg-black/20 px-4 py-3 text-sm text-gray-300">
                        Active threshold: <span className="text-white">{overview.tuning.activeUserThreshold}</span>
                    </div>
                </div>
            </section>

            <p className="text-xs text-gray-600">
                Generated {new Date(overview.generatedAt).toLocaleString()} &middot;{" "}
                <Link href="/admin" className="text-pink-300 hover:text-white">
                    Back to overview
                </Link>
            </p>
        </div>
    );
}
