"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
    setAdminFeatureFlag,
    updateAdminSignupCapConfig,
    releaseAdminWaitlist,
    admitSpecificUserFromWaitlist,
    openAppToEveryone,
    resetUserAdmission,
    updateAdminMatchmakerV2Rollout,
} from "@/lib/actions/admin";
import type { AdmissionStats, GenderBucket } from "@/lib/services/admission-service";

type WaitlistedProfile = Awaited<ReturnType<typeof import("@/lib/actions/admin").getAdminWaitlistedProfiles>>[number];
type ActionResult = { kind: "success" | "error"; message: string } | null;

export function FeatureFlagToggle({
    flagKey,
    enabled,
    enableBlockedReason,
}: {
    flagKey: string;
    enabled: boolean;
    enableBlockedReason?: string;
}) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<ActionResult>(null);
    const isEnableBlocked = !enabled && Boolean(enableBlockedReason);

    const handleToggle = () => {
        startTransition(async () => {
            setResult(null);
            try {
                const response = await setAdminFeatureFlag(flagKey, !enabled);
                setResult({
                    kind: response.ok ? "success" : "error",
                    message: response.message,
                });
            } catch (error) {
                setResult({
                    kind: "error",
                    message: error instanceof Error ? error.message : "The feature flag could not be updated.",
                });
            }
        });
    };

    return (
        <div className="max-w-64 text-right">
            <button
                type="button"
                onClick={handleToggle}
                disabled={isPending || isEnableBlocked}
                aria-describedby={enableBlockedReason ? `${flagKey}-toggle-status` : undefined}
                className={`inline-flex min-h-11 min-w-[132px] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    enabled
                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-white/10 text-gray-300 hover:bg-white/15"
                } disabled:cursor-not-allowed disabled:opacity-50`}
            >
                {isPending ? "Saving..." : enabled ? "Disable" : "Enable"}
            </button>
            {(enableBlockedReason || result) && (
                <p
                    id={`${flagKey}-toggle-status`}
                    role={result?.kind === "error" ? "alert" : "status"}
                    aria-live="polite"
                    className={`mt-2 text-xs leading-5 ${result?.kind === "error" ? "text-rose-300" : result?.kind === "success" ? "text-emerald-300" : "text-amber-200"}`}
                >
                    {result?.message ?? enableBlockedReason}
                </p>
            )}
        </div>
    );
}

export function MatchmakerV2RolloutPanel({ config }: { config: Record<string, unknown> }) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<ActionResult>(null);
    const router = useRouter();
    const percentage = [0, 5, 25, 50, 100].includes(Number(config.percentage)) ? Number(config.percentage) : 100;
    const internalUserIds = Array.isArray(config.internalUserIds) ? config.internalUserIds.filter((value): value is string => typeof value === "string").join(", ") : "";
    const rollbackReady = config.rollbackReady === true;

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            setResult(null);
            try {
                const response = await updateAdminMatchmakerV2Rollout(formData);
                setResult({ kind: response.ok ? "success" : "error", message: response.message });
                router.refresh();
            } catch (error) {
                setResult({
                    kind: "error",
                    message: error instanceof Error ? error.message : "The rollout controls could not be saved.",
                });
            }
        });
    };

    return (
        <form action={handleSubmit} className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-sm font-semibold text-white">Staged rollout</p><p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400">Save these controls before enabling V2. Hold each external stage for one complete Nairobi quota-reset cycle. The master toggle remains the emergency rollback.</p></div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${rollbackReady ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"}`}>{rollbackReady ? "Rollback ready" : "Readiness required"}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1"><span className="text-xs font-medium text-gray-400">Eligible users</span><select name="percentage" defaultValue={percentage} className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">{[0, 5, 25, 50, 100].map((stage) => <option key={stage} value={stage}>{stage === 0 ? "Internal users only" : `${stage}%`}</option>)}</select></label>
                <label className="flex flex-col gap-1"><span className="text-xs font-medium text-gray-400">Internal user IDs</span><input name="internalUserIds" defaultValue={internalUserIds} placeholder="id-1, id-2" className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></label>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm text-gray-300"><input type="checkbox" name="rollbackReady" defaultChecked={rollbackReady} className="h-5 w-5" /><span>Production verification and the rollback switch have both been exercised</span></label>
            <button type="submit" disabled={isPending} className="min-h-11 rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50">{isPending ? "Saving..." : "Save rollout controls"}</button>
            {result && <p role={result.kind === "error" ? "alert" : "status"} aria-live="polite" className={`text-xs leading-5 ${result.kind === "success" ? "text-emerald-300" : "text-rose-300"}`}>{result.message}</p>}
        </form>
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
    waitlistedProfiles,
}: {
    stats: AdmissionStats;
    enabled: boolean;
    waitlistedProfiles: WaitlistedProfile[];
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

            <AdmitSpecificUserForm waitlistedProfiles={waitlistedProfiles} />

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

function AdmitSpecificUserForm({ waitlistedProfiles }: { waitlistedProfiles: WaitlistedProfile[] }) {
    const [isPending, startTransition] = useTransition();
    const [identifier, setIdentifier] = useState("");
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<
        | { kind: "success"; message: string }
        | { kind: "error"; message: string }
        | null
    >(null);
    const router = useRouter();
    const filteredProfiles = waitlistedProfiles.filter((profile) => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return true;
        return [
            profile.name,
            profile.email,
            profile.phoneNumber,
            profile.gender,
            profile.course,
            profile.university,
            profile.userId,
        ].filter(Boolean).join(" ").toLowerCase().includes(normalized);
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = identifier.trim();
        if (!trimmed) return;
        if (!window.confirm(`Admit "${trimmed}" from the waitlist now?`)) return;

        startTransition(async () => {
            setResult(null);
            try {
                const res = await admitSpecificUserFromWaitlist(trimmed);
                setResult({
                    kind: "success",
                    message: `Admitted ${res.email}. Previous status: ${res.previousStatus ?? "not set"}.`,
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
        <form onSubmit={handleSubmit} className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-200">Admit one person</p>
            <p className="mt-1 text-xs text-emerald-200/70">
                Search waitlisted profiles by name, email, course, phone, or select one from the dropdown.
            </p>

            <div className="mt-4 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search waitlist..."
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none"
                />
                <select
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                >
                    <option value="">Select waitlisted profile</option>
                    {filteredProfiles.map((profile) => (
                        <option key={profile.userId} value={profile.email}>
                            {profile.name} - {profile.email} - {profile.gender ?? "no gender"} - #{profile.waitlistPosition ?? "?"}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Or type email / user id manually"
                    className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={isPending || !identifier.trim()}
                    className="rounded-md bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                >
                    {isPending ? "Admitting..." : "Admit user"}
                </button>
            </div>
            <p className="mt-2 text-xs text-emerald-200/70">
                Showing {filteredProfiles.length} of {waitlistedProfiles.length} waitlisted profiles.
            </p>

            {result && (
                <p className={`mt-3 text-xs ${result.kind === "success" ? "text-emerald-300" : "text-rose-300"}`}>
                    {result.message}
                </p>
            )}
        </form>
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
            <p className="text-sm font-semibold text-white">Reset a user&apos;s admission</p>
            <p className="mt-1 text-xs text-gray-400">
                Dev helper for testing the waitlist flow. Clears the user&apos;s waitlist status and
                re-runs the gate with current caps. Safe to run on yourself, so you can use this to
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
