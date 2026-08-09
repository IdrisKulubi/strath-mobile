import {
    getAdminFeatureFlags,
    getAdminSignupCapStats,
    getAdminWaitlistedProfiles,
    getHomeExperienceComparison,
    type HomeExperienceMetrics,
} from "@/lib/actions/admin";
import { APP_FEATURE_KEYS } from "@/lib/feature-flags";

import { FeatureFlagToggle, MatchmakerQuotaPanel, MatchmakerV2RolloutPanel, SignupCapPanel } from "./_actions";

export default async function AdminFeatureFlagsPage() {
    const [flags, stats, waitlistedProfiles, comparison] = await Promise.all([
        getAdminFeatureFlags(),
        getAdminSignupCapStats(),
        getAdminWaitlistedProfiles(),
        getHomeExperienceComparison(),
    ]);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
                <p className="mt-1 text-sm text-gray-400">
                    Turn operational features on and off without shipping a new mobile build.
                </p>
            </div>

            <div className="space-y-6">
                {flags.map((flag) => {
                    const isSignupCap = flag.key === APP_FEATURE_KEYS.signupCapEnabled;
                    const isMatchmakerV2 = flag.key === APP_FEATURE_KEYS.matchmakerPersonalizationV2;

                    return (
                        <div
                            key={flag.key}
                            className="rounded-xl border border-white/10 bg-white/5 p-5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="max-w-2xl">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg font-semibold text-white">
                                            {flag.label}
                                        </h2>
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                                flag.enabled
                                                    ? "bg-emerald-500/20 text-emerald-300"
                                                    : "bg-white/10 text-gray-400"
                                            }`}
                                        >
                                            {flag.enabled ? "Enabled" : "Disabled"}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-gray-400">
                                        {flag.description}
                                    </p>
                                    <p className="mt-3 text-xs text-gray-500">
                                        {flag.updatedAt
                                            ? `Last changed: ${new Date(flag.updatedAt).toLocaleString("en-KE", {
                                                  dateStyle: "medium",
                                                  timeStyle: "short",
                                              })}`
                                            : "This flag has not been changed yet."}
                                    </p>
                                </div>

                                <FeatureFlagToggle
                                    flagKey={flag.key}
                                    enabled={flag.enabled}
                                    enableBlockedReason={
                                        isMatchmakerV2 && !flag.enabled && flag.config.rollbackReady !== true
                                            ? "Save rollback readiness below before enabling V2."
                                            : undefined
                                    }
                                />
                            </div>

                            {isSignupCap && (
                                <div className="mt-6 border-t border-white/10 pt-6">
                                    <SignupCapPanel stats={stats} enabled={flag.enabled} waitlistedProfiles={waitlistedProfiles} />
                                </div>
                            )}
                            {isMatchmakerV2 && (
                                <div className="mt-6 border-t border-white/10 pt-6">
                                    <MatchmakerV2RolloutPanel config={flag.config} />
                                    <MatchmakerQuotaPanel config={flag.config} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-lg font-semibold text-white">Home experience comparison</h2>
                <p className="mt-1 text-sm text-gray-400">
                    Compare engagement for V1 daily profiles and the V2 matchmaker experience.
                </p>
                <div className="mt-5 grid gap-6 xl:grid-cols-2">
                    <ComparisonTable title="Last 7 days" v1={comparison.sevenDays.v1} v2={comparison.sevenDays.v2} />
                    <ComparisonTable title="Last 30 days" v1={comparison.thirtyDays.v1} v2={comparison.thirtyDays.v2} />
                </div>
            </div>
        </div>
    );
}

function ComparisonTable({ title, v1, v2 }: { title: string; v1: HomeExperienceMetrics; v2: HomeExperienceMetrics }) {
    const rows = [
        ["Exposed users", v1.exposedUsers, v2.exposedUsers],
        ["Profile opens", v1.profileOpens, v2.profileOpens],
        ["Interested", v1.interested, v2.interested],
        ["Passes", v1.passes, v2.passes],
        ["Mutual matches", v1.mutualMatches, v2.mutualMatches],
        ["Interested / exposed", `${v1.interestedConversionPct}%`, `${v2.interestedConversionPct}%`],
        ["Mutual / exposed", `${v1.mutualConversionPct}%`, `${v2.mutualConversionPct}%`],
    ];

    return (
        <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-200">{title}</h3>
            <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="w-full text-sm">
                    <thead className="bg-white/5 text-left text-gray-400">
                        <tr><th className="px-3 py-2 font-medium">Metric</th><th className="px-3 py-2 font-medium">V1</th><th className="px-3 py-2 font-medium">V2</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {rows.map(([label, v1Value, v2Value]) => (
                            <tr key={String(label)} className="text-gray-200">
                                <td className="px-3 py-2 text-gray-400">{label}</td>
                                <td className="px-3 py-2 font-medium">{v1Value}</td>
                                <td className="px-3 py-2 font-medium">{v2Value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
