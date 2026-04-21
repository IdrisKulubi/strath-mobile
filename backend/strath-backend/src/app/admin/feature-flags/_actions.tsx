"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
    setAdminFeatureFlag,
    updateAdminSignupCapConfig,
    releaseAdminWaitlist,
    openAppToEveryone,
    resetUserAdmission,
} from "@/lib/actions/admin";
import type { AdmissionStats, GenderBucket } from "@/lib/services/admission-service";

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

// ─── Signup cap panel ────────────────────────────────────────────────────────

const BUCKET_META: Record<
    GenderBucket,
    { label: string; accent: string; bar: string }
> = {
    male: {
        label: "Guys",
        accent: "text-sky-300",
        bar: "bg-sky-400",
    },
    female: {
        label: "Ladies",
        accent: "text-pink-300",
        bar: "bg-pink-400",
    },
    other: {
        label: "Other",
        accent: "text-purple-300",
        bar: "bg-purple-400",
    },
};

export function SignupCapPanel({
    stats,
    enabled,
}: {
    stats: AdmissionStats;
    enabled: boolean;
}) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(Object.keys(BUCKET_META) as GenderBucket[]).map((bucket) => {
                    const max =
                        bucket === "male"
                            ? stats.caps.maxMale
                            : bucket === "female"
                            ? stats.caps.maxFemale
                            : stats.caps.maxOther;
                    return (
                        <BucketCard
                            key={bucket}
                            bucket={bucket}
                            admitted={stats.admitted[bucket]}
                            waitlisted={stats.waitlisted[bucket]}
                            max={max}
                            enabled={enabled}
                        />
                    );
                })}
            </div>

            <CapConfigForm stats={stats} />

            <OpenToEveryoneButton
                disabledUntilFlag={!enabled && totalWaitlisted(stats) === 0}
                waitlistedCount={totalWaitlisted(stats)}
            />

            <ResetAdmissionForm />
        </div>
    );
}

function totalWaitlisted(stats: AdmissionStats) {
    return stats.waitlisted.male + stats.waitlisted.female + stats.waitlisted.other;
}

function BucketCard({
    bucket,
    admitted,
    waitlisted,
    max,
    enabled,
}: {
    bucket: GenderBucket;
    admitted: number;
    waitlisted: number;
    max: number;
    enabled: boolean;
}) {
    const meta = BUCKET_META[bucket];
    const pct = max > 0 ? Math.min(100, Math.round((admitted / max) * 100)) : 0;
    const full = admitted >= max;

    return (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-baseline justify-between">
                <p className={`text-sm font-semibold ${meta.accent}`}>{meta.label}</p>
                <p className="text-xs text-gray-400">
                    {admitted} / {max}
                </p>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                    className={`h-full ${meta.bar} transition-all`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                    Waitlisted: <span className="font-semibold text-gray-300">{waitlisted}</span>
                </p>
                {full && enabled && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                        Full
                    </span>
                )}
            </div>

            {waitlisted > 0 && (
                <div className="mt-4">
                    <ReleaseButton bucket={bucket} waitlistedCount={waitlisted} />
                </div>
            )}
        </div>
    );
}

function ReleaseButton({
    bucket,
    waitlistedCount,
}: {
    bucket: GenderBucket;
    waitlistedCount: number;
}) {
    const [isPending, startTransition] = useTransition();
    const [howMany, setHowMany] = useState<number>(Math.min(10, waitlistedCount));
    const router = useRouter();

    const handleRelease = () => {
        if (howMany <= 0) return;
        if (!window.confirm(`Release ${howMany} ${BUCKET_META[bucket].label.toLowerCase()} from the waitlist? They'll get a push notification.`)) return;

        startTransition(async () => {
            await releaseAdminWaitlist(bucket, howMany);
            router.refresh();
        });
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="number"
                min={1}
                max={waitlistedCount}
                value={howMany}
                onChange={(e) => setHowMany(Math.max(1, Math.min(waitlistedCount, Number(e.target.value) || 0)))}
                className="w-16 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white focus:border-white/30 focus:outline-none"
            />
            <button
                type="button"
                onClick={handleRelease}
                disabled={isPending || howMany <= 0}
                className="flex-1 rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
            >
                {isPending ? "Releasing..." : "Release"}
            </button>
        </div>
    );
}

function CapConfigForm({ stats }: { stats: AdmissionStats }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            await updateAdminSignupCapConfig(formData);
            router.refresh();
        });
    };

    return (
        <form action={handleSubmit} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Capacity limits</p>
            <p className="mt-1 text-xs text-gray-400">
                Raising a cap will automatically admit anyone already on the waitlist who now fits, and push them a notification.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <CapInput name="maxMale" label="Max guys" defaultValue={stats.caps.maxMale} />
                <CapInput name="maxFemale" label="Max ladies" defaultValue={stats.caps.maxFemale} />
                <CapInput name="maxOther" label="Max other" defaultValue={stats.caps.maxOther} />
            </div>

            <button
                type="submit"
                disabled={isPending}
                className="mt-4 rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-50"
            >
                {isPending ? "Saving..." : "Save caps"}
            </button>
        </form>
    );
}

function CapInput({
    name,
    label,
    defaultValue,
}: {
    name: string;
    label: string;
    defaultValue: number;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-400">{label}</span>
            <input
                type="number"
                name={name}
                min={0}
                defaultValue={defaultValue}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
            />
        </label>
    );
}

function OpenToEveryoneButton({
    waitlistedCount,
    disabledUntilFlag,
}: {
    waitlistedCount: number;
    disabledUntilFlag: boolean;
}) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleClick = () => {
        const confirmMsg =
            waitlistedCount > 0
                ? `Disable the cap and admit ${waitlistedCount} waitlisted users? Each will get a "You're in" push notification. This cannot be undone.`
                : "Disable the cap and open signups to everyone? New users will be admitted immediately.";

        if (!window.confirm(confirmMsg)) return;

        startTransition(async () => {
            await openAppToEveryone();
            router.refresh();
        });
    };

    return (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-200">Open to everyone</p>
            <p className="mt-1 text-xs text-amber-200/70">
                Ends the soft launch. Turns the cap off and admits all {waitlistedCount} waitlisted users right now.
            </p>
            <button
                type="button"
                onClick={handleClick}
                disabled={isPending || disabledUntilFlag}
                className="mt-3 rounded-md bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/30 disabled:opacity-40"
            >
                {isPending ? "Opening..." : "Open the app to everyone"}
            </button>
        </div>
    );
}

function ResetAdmissionForm() {
    const [isPending, startTransition] = useTransition();
    const [identifier, setIdentifier] = useState("");
    const [result, setResult] = useState<
        | { kind: "success"; message: string }
        | { kind: "error"; message: string }
        | null
    >(null);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = identifier.trim();
        if (!trimmed) return;
        if (
            !window.confirm(
                `Reset admission for "${trimmed}"? Their waitlist status will be cleared and the gate will run again with the current caps.`
            )
        ) {
            return;
        }

        startTransition(async () => {
            setResult(null);
            try {
                const res = await resetUserAdmission(trimmed);
                const outcome = res.admission?.status ?? "pending";
                setResult({
                    kind: "success",
                    message: res.reRan
                        ? `Reset ${res.email}. New status: ${outcome}${
                              res.admission?.status === "waitlisted" && res.admission.position
                                  ? ` (position ${res.admission.position})`
                                  : ""
                          }.`
                        : `Reset ${res.email}. They haven't finished onboarding yet — the gate will run when they do.`,
                });
                setIdentifier("");
                router.refresh();
            } catch (err) {
                setResult({
                    kind: "error",
                    message: err instanceof Error ? err.message : "Something went wrong",
                });
            }
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-white/10 bg-white/5 p-4"
        >
            <p className="text-sm font-semibold text-white">Reset a user's admission</p>
            <p className="mt-1 text-xs text-gray-400">
                Dev helper for testing the waitlist flow. Clears the user's waitlist status and
                re-runs the gate with current caps. Safe to run on yourself — you can use this to
                bounce between admitted and waitlisted as you tune caps.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="user@email.com or user id"
                    className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={isPending || !identifier.trim()}
                    className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-50"
                >
                    {isPending ? "Resetting..." : "Reset admission"}
                </button>
            </div>

            {result && (
                <p
                    className={`mt-3 text-xs ${
                        result.kind === "success" ? "text-emerald-300" : "text-rose-300"
                    }`}
                >
                    {result.message}
                </p>
            )}
        </form>
    );
}
