import { getAdminFeatureFlags, getAdminSignupCapStats } from "@/lib/actions/admin";
import { APP_FEATURE_KEYS } from "@/lib/feature-flags";

import { FeatureFlagToggle, SignupCapPanel } from "./_actions";

export default async function AdminFeatureFlagsPage() {
    const [flags, stats] = await Promise.all([
        getAdminFeatureFlags(),
        getAdminSignupCapStats(),
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

                                <FeatureFlagToggle flagKey={flag.key} enabled={flag.enabled} />
                            </div>

                            {isSignupCap && (
                                <div className="mt-6 border-t border-white/10 pt-6">
                                    <SignupCapPanel stats={stats} enabled={flag.enabled} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
