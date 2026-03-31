"use client";

import { useTransition } from "react";

import { setAdminFeatureFlag } from "@/lib/actions/admin";

export function FeatureFlagToggle({
    flagKey,
    enabled,
}: {
    flagKey: string;
    enabled: boolean;
}) {
    const [isPending, startTransition] = useTransition();

    return (
        <button
            type="button"
            onClick={() => startTransition(() => setAdminFeatureFlag(flagKey, !enabled))}
            disabled={isPending}
            className={`inline-flex min-w-[132px] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                enabled
                    ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    : "bg-white/10 text-gray-300 hover:bg-white/15"
            } ${isPending ? "opacity-60" : ""}`}
        >
            {isPending ? "Saving..." : enabled ? "Disable" : "Enable"}
        </button>
    );
}
