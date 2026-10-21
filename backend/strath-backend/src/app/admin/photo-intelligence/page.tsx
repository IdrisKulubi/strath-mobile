import Link from "next/link";

import { getAdminPhotoIntelligenceOverview } from "@/lib/actions/admin";

import { InteractionChart } from "./_chart";
import { PhotoOpsPanel } from "./_ops-panel";

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
        healthy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        warning: "bg-amber-500/15 text-amber-200 border-amber-500/30",
        critical: "bg-red-500/15 text-red-200 border-red-500/30",
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
        return (
            <p className="text-sm text-emerald-300">
                Pipeline looks healthy. Photo analysis and learning loops are within expected thresholds.
            </p>
        );
    }

    const tones = {
        info: "border-sky-500/20 bg-sky-500/10 text-sky-200",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-200",
        critical: "border-red-500/20 bg-red-500/10 text-red-200",
    };

    return (
        <div className="space-y-2">
            {alerts.map((alert) => (
                <p
                    key={alert.message}
                    className={`rounded-lg border px-3 py-2 text-sm ${tones[alert.severity]}`}
                >
                    {alert.message}
                </p>
            ))}
        </div>
    );
}

export default async function AdminPhotoIntelligencePage() {
    const overview = await getAdminPhotoIntelligenceOverview();

    return (
        <div className="space-y-8 p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Photo Intelligence</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-400">
                        Live view of photo-aware matching: profile quality coverage, visual preference learning,
                        and correlational match-impact proxies. This system improves recommendations using photo
                        quality and learned visual preferences — not beauty scores.
                    </p>
                </div>
                <StatusBadge status={overview.systemStatus} />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">System status</h2>
                <div className="mt-4">
                    <AlertList alerts={overview.alerts} />
                </div>
            </div>

            <section>
                <div className="mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Pipeline coverage
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Is photo analysis running and are profiles usable for matching?
                    </p>
                </div>

                {!overview.coverage.hasAnalysisData ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-gray-500">
                        No photo analysis data yet. Uploads and backfill will populate this section.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
                        <MetricCard
                            label="Analyzed"
                            value={overview.coverage.profilesAnalyzed}
                            hint={`${overview.coverage.analysisCoveragePct}% of ${overview.coverage.eligibleProfiles} eligible`}
                            accent="text-pink-300"
                        />
                        <MetricCard
                            label="Usable photos"
                            value={`${overview.coverage.usablePhotoRatePct}%`}
                            hint={`${overview.coverage.usablePhotoCount} profiles`}
                            accent="text-emerald-300"
                        />
                        <MetricCard
                            label="Avg quality"
                            value={overview.coverage.avgPhotoQualityScore}
                            hint="0–100 scale"
                        />
                        <MetricCard
                            label="Embeddings"
                            value={`${overview.coverage.embeddingCoveragePct}%`}
                            hint={`${overview.coverage.usersWithEmbeddings} users`}
                            accent="text-cyan-300"
                        />
                        <MetricCard
                            label="Low quality"
                            value={overview.coverage.lowQualityProfiles}
                            hint="score &lt; 45"
                            accent={overview.coverage.lowQualityProfiles > 0 ? "text-amber-300" : "text-white"}
                        />
                        <MetricCard
                            label="Unanalyzed assets"
                            value={overview.coverage.unanalyzedAssets}
                            hint={`${overview.coverage.needsReviewPhotos} need review`}
                            accent={overview.coverage.unanalyzedAssets >= 20 ? "text-red-300" : "text-white"}
                        />
                    </div>
                )}

                {overview.coverage.hasAnalysisData ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <div className="rounded-lg bg-white/5 px-4 py-3 text-sm text-gray-300">
                            &lt;30: {overview.coverage.qualityBelow30}
                        </div>
                        <div className="rounded-lg bg-white/5 px-4 py-3 text-sm text-gray-300">
                            30–44: {overview.coverage.quality30To44}
                        </div>
                        <div className="rounded-lg bg-white/5 px-4 py-3 text-sm text-gray-300">
                            45–69: {overview.coverage.quality45To69}
                        </div>
                        <div className="rounded-lg bg-white/5 px-4 py-3 text-sm text-gray-300">
                            70+: {overview.coverage.quality70Plus}
                        </div>
                    </div>
                ) : null}
            </section>

            <section>
                <div className="mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Self-improving loop
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Likes and passes update visual preference centroids. Confidence rises as users engage.
                    </p>
                </div>

                {!overview.learning.hasLearningData ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-gray-500">
                        No visual preference data yet. Likes and passes will start training centroids.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
                            <MetricCard
                                label="Preference profiles"
                                value={overview.learning.usersWithPreferenceSignals}
                                hint={`${overview.learning.usersWithLikedCentroid} with liked centroid`}
                            />
                            <MetricCard
                                label="Mature confidence"
                                value={`${overview.learning.confidenceMaturePct}%`}
                                hint={`${overview.learning.confidenceMature} users at 46+`}
                                accent="text-emerald-300"
                            />
                            <MetricCard
                                label="Likes (7d)"
                                value={overview.learning.visualLikes7d}
                                hint={`${overview.learning.visualLikes30d} in 30d`}
                                accent="text-green-300"
                            />
                            <MetricCard
                                label="Passes (7d)"
                                value={overview.learning.visualPasses7d}
                                hint={`${overview.learning.visualPasses30d} in 30d`}
                            />
                            <MetricCard
                                label="Views (7d)"
                                value={overview.learning.visualViews7d}
                            />
                            <MetricCard
                                label="Centroid updates (7d)"
                                value={overview.learning.preferenceUpdates7d}
                                hint={overview.learning.isLearningActive ? "Loop active" : "Idle"}
                                accent={overview.learning.isLearningActive ? "text-emerald-300" : "text-amber-300"}
                            />
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-lg bg-white/5 px-4 py-3 text-sm text-gray-300">
                                Cold (0–10): {overview.learning.confidenceCold}
                            </div>
                            <div className="rounded-lg bg-white/5 px-4 py-3 text-sm text-gray-300">
                                Warming (11–45): {overview.learning.confidenceWarming}
                            </div>
                            <div className="rounded-lg bg-white/5 px-4 py-3 text-sm text-gray-300">
                                Mature (46–75): {overview.learning.confidenceMature}
                            </div>
                        </div>

                        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
                            <h3 className="mb-4 text-sm font-semibold text-white">Visual interactions (30 days)</h3>
                            <InteractionChart data={overview.interactionTimeSeries} />
                        </div>
                    </>
                )}
            </section>

            <section>
                <div className="mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Match impact proxies
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Correlational only (30-day daily recommendations). Photo scores are not stored per
                        recommendation event yet, so this is not causal proof.
                    </p>
                </div>

                {!overview.matchImpact.hasRecommendationData ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-gray-500">
                        No recommendation decisions in the last 30 days to compare.
                    </div>
                ) : (
                    <>
                        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                            <MetricCard
                                label="Mutual today"
                                value={overview.matchImpact.mutualMatchesToday}
                                accent="text-pink-300"
                            />
                            <MetricCard
                                label="Mutual (7d)"
                                value={overview.matchImpact.mutualMatches7d}
                            />
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
                                        <th className="px-5 py-3">Segment</th>
                                        <th className="px-5 py-3">Decisions</th>
                                        <th className="px-5 py-3">Interested</th>
                                        <th className="px-5 py-3">Interested rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {overview.matchImpact.proxies.map((proxy) => (
                                        <tr key={proxy.label} className="border-b border-white/5 text-gray-300">
                                            <td className="px-5 py-3 text-white">{proxy.label}</td>
                                            <td className="px-5 py-3">{proxy.decisions}</td>
                                            <td className="px-5 py-3">{proxy.interested}</td>
                                            <td className="px-5 py-3 font-semibold text-emerald-300">
                                                {proxy.interestedRate != null ? `${proxy.interestedRate}%` : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>

            {overview.embeddingProviders.length > 0 ? (
                <section className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Embedding providers
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {overview.embeddingProviders.map((row) => (
                            <span
                                key={`${row.provider}:${row.model}`}
                                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300"
                            >
                                {row.provider} / {row.model}: {row.count}
                            </span>
                        ))}
                    </div>
                </section>
            ) : null}

            <section className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Known measurement gaps
                </h2>
                <div className="mt-4 space-y-3">
                    {overview.knownGaps.map((gap) => (
                        <div key={gap.label} className="rounded-lg bg-black/20 px-4 py-3">
                            <p className="text-sm font-medium text-white">{gap.label}</p>
                            <p className="mt-1 text-xs text-gray-500">{gap.reason}</p>
                        </div>
                    ))}
                </div>
            </section>

            <PhotoOpsPanel
                lowQualityProfiles={overview.lowQualityProfiles}
                needsReviewPhotos={overview.needsReviewPhotos}
            />

            <p className="text-xs text-gray-600">
                Generated {new Date(overview.generatedAt).toLocaleString()} ·{" "}
                <Link href="/admin" className="text-pink-300 hover:text-white">
                    Back to overview
                </Link>
            </p>
        </div>
    );
}
