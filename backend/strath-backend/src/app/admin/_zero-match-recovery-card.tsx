"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bell, Loader2, RefreshCw, UserPlus, Users } from "lucide-react";

import {
    generateMatchesForAllZeroMatchUsers,
    generateMatchesForZeroMatchUser,
    type ZeroMatchRecoveryUser,
} from "@/lib/actions/manual-matchmaking";

const REASON_LABELS: Record<ZeroMatchRecoveryUser["reason"], string> = {
    no_active_pairs: "No active matches",
    no_push_token: "No push token",
    candidate_pool_empty: "Candidate pool empty",
};

export function ZeroMatchRecoveryCard({ users }: { users: ZeroMatchRecoveryUser[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [activeUserId, setActiveUserId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generateForUser = (userId: string) => {
        setMessage(null);
        setError(null);
        setActiveUserId(userId);
        startTransition(async () => {
            try {
                const result = await generateMatchesForZeroMatchUser(userId);
                setMessage(
                    result.activeMatches > 0
                        ? `Generated ${result.activeMatches} match${result.activeMatches === 1 ? "" : "es"}. ${result.notificationSent ? "Notification sent." : "No notification sent."}`
                        : "No eligible candidates were found for this user."
                );
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not generate matches");
            } finally {
                setActiveUserId(null);
            }
        });
    };

    const generateForAll = () => {
        setMessage(null);
        setError(null);
        setActiveUserId("all");
        startTransition(async () => {
            try {
                const result = await generateMatchesForAllZeroMatchUsers();
                setMessage(
                    `Generated matches for ${result.generatedFor} users. ${result.stillZero} still have no eligible pool. ${result.notificationsSent} notifications sent${result.notificationFailures ? `, ${result.notificationFailures} failed` : ""}.`
                );
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not generate matches");
            } finally {
                setActiveUserId(null);
            }
        });
    };

    return (
        <section className="mb-8 rounded-xl border border-sky-400/25 bg-sky-500/10 p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="inline-flex size-9 items-center justify-center rounded-full bg-sky-400/15 text-sky-200">
                            <Users className="size-4" />
                        </span>
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-100">
                                Users with no matches
                            </h2>
                            <p className="mt-1 text-sm text-sky-100/70">
                                Eligible users who currently have no active daily cards and no mutual/date hold.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/admin/matchmaking"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white"
                    >
                        Manual matchmaking
                    </Link>
                    <button
                        type="button"
                        onClick={generateForAll}
                        disabled={isPending || users.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {activeUserId === "all" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        Generate for all
                    </button>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniStat label="Zero-match users" value={users.length} />
                <MiniStat label="No push token" value={users.filter((user) => !user.pushEnabled).length} />
                <MiniStat label="Pool empty" value={users.filter((user) => user.reason === "candidate_pool_empty").length} />
                <MiniStat label="Can notify" value={users.filter((user) => user.pushEnabled).length} />
            </div>

            {(message || error) && (
                <div className={`mb-4 rounded-lg border p-3 text-sm ${error ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>
                    {error ?? message}
                </div>
            )}

            {users.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-black/15 px-4 py-5 text-sm text-sky-100/70">
                    Every eligible user currently has matches or is on a hold.
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-white/10">
                    <div className="max-h-[420px] overflow-auto">
                        <table className="w-full min-w-[920px] text-left text-sm">
                            <thead className="sticky top-0 bg-slate-950/95 text-[11px] uppercase tracking-wide text-sky-100/55 backdrop-blur">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">User</th>
                                    <th className="px-4 py-3 font-semibold">Match prefs</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Activity</th>
                                    <th className="px-4 py-3 font-semibold">Reason</th>
                                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {users.slice(0, 50).map((user) => (
                                    <tr key={user.userId} className="bg-white/[0.02] text-white/80">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-white">{user.name}</div>
                                            <div className="text-xs text-white/40">{user.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="capitalize">{user.gender ?? "Unknown"}</div>
                                            <div className="text-xs text-white/40">
                                                Wants {user.interestedIn.length ? user.interestedIn.join(", ") : "any"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold uppercase text-emerald-200">
                                                    {user.profileStatus}
                                                </span>
                                                {user.pushEnabled ? <Bell className="size-3.5 text-sky-200" /> : null}
                                            </div>
                                            <div className="mt-1 text-xs text-white/40">{user.verificationStatus}</div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-white/50">
                                            <div>Joined {formatDate(user.createdAt)}</div>
                                            <div>Active {formatDate(user.lastActive)}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-semibold text-sky-100">{REASON_LABELS[user.reason]}</div>
                                            <div className="text-xs text-white/40">{user.candidatePoolSize} possible pool</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => generateForUser(user.userId)}
                                                disabled={isPending}
                                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {activeUserId === user.userId ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                                                Generate
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {users.length > 50 && (
                        <div className="border-t border-white/10 px-4 py-3 text-xs text-white/45">
                            Showing 50 of {users.length}. Use bulk generation to process the full list.
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

function MiniStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-white/10 bg-black/15 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-sky-100/50">{label}</p>
            <p className="mt-1 text-xl font-bold text-white">{value}</p>
        </div>
    );
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-KE", {
        month: "short",
        day: "numeric",
    });
}
