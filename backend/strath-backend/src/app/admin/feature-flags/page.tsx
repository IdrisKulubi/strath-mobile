import { getAdminFeatureFlags } from "@/lib/actions/admin";

import { FeatureFlagToggle } from "./_actions";

export default async function AdminFeatureFlagsPage() {
    const flags = await getAdminFeatureFlags();

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
                <p className="mt-1 text-sm text-gray-400">
                    Turn review-only or operational features on and off without shipping a new mobile build.
                </p>
            </div>

            <div className="space-y-4">
                {flags.map((flag) => (
                    <div key={flag.key} className="rounded-xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="max-w-2xl">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-semibold text-white">{flag.label}</h2>
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
                                <p className="mt-2 text-sm leading-6 text-gray-400">{flag.description}</p>
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
                    </div>
                ))}
            </div>
        </div>
    );
}
