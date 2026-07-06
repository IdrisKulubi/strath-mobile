import Link from "next/link";

import { getAdminProfileIntelligenceOverview } from "@/lib/actions/admin";

type MatchmakerQuality = Awaited<ReturnType<typeof getAdminProfileIntelligenceOverview>>["matchmakerQuality"];
type RolloutTone = "good" | "watch" | "neutral";

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

function RolloutStatusPill({ tone, label }: { tone: RolloutTone; label: string }) {
    const tones = {
        good: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
        watch: "border-amber-500/25 bg-amber-500/10 text-amber-200",
        neutral: "border-white/10 bg-white/5 text-gray-300",
    };

    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}>
            {label}
        </span>
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

function RolloutReadinessRow({
    label,
    value,
    hint,
    tone,
    status,
}: {
    label: string;
    value: string;
    hint: string;
    tone: RolloutTone;
    status: string;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gray-200">{label}</p>
                <RolloutStatusPill tone={tone} label={status} />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">{hint}</p>
        </div>
    );
}

function QaChecklistItem({ label }: { label: string }) {
    return (
        <li className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pink-300" />
            <span>{label}</span>
        </li>
    );
}

function MatchmakerRolloutPanel({ quality }: { quality: MatchmakerQuality }) {
    const hasTraffic = quality.sessions7d > 0 || quality.searches7d > 0 || quality.candidatesShown7d > 0;
    const repeatTone: RolloutTone = !hasTraffic ? "neutral" : quality.repeatedCandidateRatePct > 25 ? "watch" : "good";
    const interestedTone: RolloutTone = !hasTraffic ? "neutral" : quality.interestedRatePct < 15 ? "watch" : "good";
    const llmTone: RolloutTone = !hasTraffic ? "neutral" : quality.llmFallbackRatePct > 10 ? "watch" : "good";
    const quotaTone: RolloutTone = !hasTraffic ? "neutral" : quality.quotaReached7d > Math.max(5, quality.sessions7d * 0.25) ? "watch" : "good";

    const qaItems = [
        "New user starts Home with no matchmaker session.",
        "Returning user resumes an active matchmaker session.",
        "Quota remaining shows the next useful candidate action.",
        "Quota reached shows a calm recovery path.",
        "No candidates state gives a next step, not a dead end.",
        "Feedback memory changes the next search.",
        "Network or API failure keeps the user on Home with retry.",
        "Matchmaker profile Interested creates the right decision.",
        "Matchmaker profile Pass creates the right decision.",
        "Mutual match creation works from matchmaker source.",
    ];

    const watchItems = [
        "Repeat candidate rate above 25%.",
        "LLM fallback rate above 10%.",
        "Interested rate below old discovery baseline.",
        "Quota reached grows faster than sessions.",
        "Support reports mention homepage confusion.",
    ];

    return (
        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-pink-200/80">Phase 7 rollout</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">Matchmaker launch readiness</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                        Use this before widening the homepage rollout. It combines behavior signals with the manual QA cases that protect the new matchmaker flow.
                    </p>
                </div>
                <RolloutStatusPill tone={hasTraffic ? "good" : "neutral"} label={hasTraffic ? "Live signals" : "Waiting"} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <RolloutReadinessRow
                    label="Candidate variety"
                    value={`${quality.repeatedCandidateRatePct}%`}
                    hint={`${quality.candidatesShown7d} candidates shown in the last 7 days.`}
                    tone={repeatTone}
                    status={repeatTone === "watch" ? "Watch" : hasTraffic ? "Good" : "No traffic"}
                />
                <RolloutReadinessRow
                    label="Decision quality"
                    value={`${quality.interestedRatePct}%`}
                    hint={`${quality.interestedCount7d} Interested from matchmaker decisions.`}
                    tone={interestedTone}
                    status={interestedTone === "watch" ? "Watch" : hasTraffic ? "Good" : "No traffic"}
                />
                <RolloutReadinessRow
                    label="LLM stability"
                    value={`${quality.llmFallbackRatePct}%`}
                    hint="Fallbacks should stay low so the assistant feels consistent."
                    tone={llmTone}
                    status={llmTone === "watch" ? "Watch" : hasTraffic ? "Good" : "No traffic"}
                />
                <RolloutReadinessRow
                    label="Quota pressure"
                    value={`${quality.quotaReached7d}`}
                    hint={`${quality.sessions7d} sessions in the last 7 days.`}
                    tone={quotaTone}
                    status={quotaTone === "watch" ? "Watch" : hasTraffic ? "Good" : "No traffic"}
                />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-200">QA checklist</h3>
                        <span className="text-xs text-gray-500">Run before each rollout step</span>
                    </div>
                    <ul className="mt-3 grid gap-2 md:grid-cols-2">
                        {qaItems.map((item) => (
                            <QaChecklistItem key={item} label={item} />
                        ))}
                    </ul>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <h3 className="text-sm font-semibold text-gray-200">Watch before widening</h3>
                    <div className="mt-3 space-y-2">
                        {watchItems.map((item) => (
                            <p key={item} className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-gray-400">
                                {item}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </section>
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

            <MatchmakerRolloutPanel quality={overview.matchmakerQuality} />

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
