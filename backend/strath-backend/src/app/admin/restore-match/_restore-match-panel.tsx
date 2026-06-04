"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Search, UserRound } from "lucide-react";

import {
    adminRestoreMatchBetweenUsers,
    getRestoreMatchHistoryForUser,
    searchUsersForRestoreMatch,
    type RestoreMatchHistoryRow,
    type RestoreMatchUserResult,
} from "@/lib/actions/admin-restore-match";

function UserChip({
    user,
    selected,
    onClick,
}: {
    user: RestoreMatchUserResult;
    selected?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                selected
                    ? "bg-[#B8327A]/20 ring-1 ring-inset ring-[#B8327A]/40"
                    : "bg-white/[0.04] hover:bg-white/[0.08]"
            }`}
        >
            {user.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePhoto} alt="" className="size-9 rounded-full object-cover" />
            ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-[#322A3D] text-xs font-semibold text-white/70">
                    {user.name.charAt(0).toUpperCase()}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                {user.email ? (
                    <p className="truncate text-[11px] text-white/40">{user.email}</p>
                ) : null}
            </div>
        </button>
    );
}

function formatWhen(iso: string) {
    return new Date(iso).toLocaleString("en-KE", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function RestoreMatchPanel() {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<RestoreMatchUserResult[]>([]);
    const [selectedUser, setSelectedUser] = useState<RestoreMatchUserResult | null>(null);
    const [history, setHistory] = useState<RestoreMatchHistoryRow[]>([]);

    const [partnerQuery, setPartnerQuery] = useState("");
    const [partnerResults, setPartnerResults] = useState<RestoreMatchUserResult[]>([]);
    const [manualPartner, setManualPartner] = useState<RestoreMatchUserResult | null>(null);

    const [note, setNote] = useState("");
    const [forceRelease, setForceRelease] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runSearch = useCallback((query: string, target: "anchor" | "partner") => {
        startTransition(async () => {
            try {
                const results = await searchUsersForRestoreMatch(query);
                if (target === "anchor") {
                    setSearchResults(results);
                } else {
                    setPartnerResults(results);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Search failed");
            }
        });
    }, []);

    const loadHistory = (user: RestoreMatchUserResult) => {
        setError(null);
        setMessage(null);
        setSelectedUser(user);
        setManualPartner(null);
        startTransition(async () => {
            try {
                const result = await getRestoreMatchHistoryForUser(user.id);
                setSelectedUser(result.user);
                setHistory(result.history);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not load history");
                setHistory([]);
            }
        });
    };

    const restoreWith = (partner: RestoreMatchUserResult) => {
        if (!selectedUser) return;
        setError(null);
        setMessage(null);
        startTransition(async () => {
            try {
                const result = await adminRestoreMatchBetweenUsers({
                    anchorUserId: selectedUser.id,
                    partnerUserId: partner.id,
                    note: note.trim() || undefined,
                    forceReleaseHolds: forceRelease,
                });
                setMessage(
                    `Intro restored. New pair id ${result.pairId.slice(0, 8)}… Both users were notified.`,
                );
                loadHistory(selectedUser);
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not restore match");
            }
        });
    };

    return (
        <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
            <section className="space-y-4 rounded-xl border border-white/[0.08] bg-[#221C2A]/60 p-4 ring-1 ring-inset ring-white/[0.04]">
                <div>
                    <h2 className="text-sm font-semibold text-white">Find user</h2>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                        Search the person who passed or cancelled by mistake.
                    </p>
                </div>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                    <input
                        value={searchQuery}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearchQuery(value);
                            if (value.trim().length >= 2) {
                                runSearch(value, "anchor");
                            } else {
                                setSearchResults([]);
                            }
                        }}
                        placeholder="Name or email"
                        className="w-full rounded-lg border border-white/[0.08] bg-[#141118] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#B8327A]/50 focus:ring-2 focus:ring-[#B8327A]/20"
                    />
                </div>
                <div className="max-h-[280px] space-y-1 overflow-y-auto">
                    {searchResults.map((row) => (
                        <UserChip
                            key={row.id}
                            user={row}
                            selected={selectedUser?.id === row.id}
                            onClick={() => loadHistory(row)}
                        />
                    ))}
                    {searchQuery.trim().length >= 2 && !pending && searchResults.length === 0 ? (
                        <p className="px-2 py-4 text-center text-xs text-white/40">No users found</p>
                    ) : null}
                </div>
                {selectedUser ? (
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                        <p className="text-[11px] font-medium text-white/40">Selected</p>
                        <p className="mt-1 text-sm font-medium text-white">{selectedUser.name}</p>
                    </div>
                ) : null}
            </section>

            <div className="space-y-6">
                {!selectedUser ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-[#221C2A]/30 px-8 py-16 text-center">
                        <UserRound className="size-10 text-white/25" strokeWidth={1.5} />
                        <p className="mt-4 text-sm text-white/50">
                            Select a user to see who they passed or cancelled.
                        </p>
                    </div>
                ) : (
                    <>
                        <section className="rounded-xl border border-white/[0.08] bg-[#221C2A]/50 p-4 ring-1 ring-inset ring-white/[0.04]">
                            <h2 className="text-sm font-semibold text-white">Restore options</h2>
                            <p className="mt-1 text-[12px] text-white/45">
                                Creates a new active intro in the database and notifies both people.
                            </p>
                            <div className="mt-3">
                                <label className="mb-1.5 block text-[12px] font-medium text-white/50">
                                    Internal note (optional)
                                </label>
                                <input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Mistaken pass, support ticket #…"
                                    className="w-full rounded-lg border border-white/[0.08] bg-[#141118] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#B8327A]/50"
                                />
                            </div>
                            <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] text-white/55">
                                <input
                                    type="checkbox"
                                    checked={forceRelease}
                                    onChange={(e) => setForceRelease(e.target.checked)}
                                    className="mt-0.5 rounded border-white/20"
                                />
                                <span>
                                    Release current hold if they already have an in-flight date with
                                    this person (use when replacing a mistaken cancel).
                                </span>
                            </label>
                        </section>

                        <section className="rounded-xl border border-white/[0.08] bg-[#221C2A]/50 ring-1 ring-inset ring-white/[0.04]">
                            <div className="border-b border-white/[0.06] px-4 py-3">
                                <h2 className="text-sm font-semibold text-white">Past connections</h2>
                                <p className="mt-0.5 text-[12px] text-white/40">
                                    Tap restore to let {selectedUser.name}{" "}
                                    see this person again.
                                </p>
                            </div>
                            {history.length === 0 ? (
                                <p className="p-8 text-center text-sm text-white/40">
                                    {pending ? "Loading…" : "No closed or passed intros found"}
                                </p>
                            ) : (
                                <ul className="divide-y divide-white/[0.04]">
                                    {history.map((row) => (
                                        <li
                                            key={`${row.pairId}-${row.partner.id}`}
                                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium text-white">
                                                    {row.partner.name}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-white/40">
                                                    {row.endedReason} · {formatWhen(row.updatedAt)}
                                                </p>
                                                {row.blockReason && !row.canRestore ? (
                                                    <p className="mt-1 text-[11px] text-amber-200/90">
                                                        {row.blockReason}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <button
                                                type="button"
                                                disabled={pending}
                                                onClick={() => restoreWith(row.partner)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#B8327A] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                            >
                                                {pending ? (
                                                    <Loader2 className="size-3.5 animate-spin" />
                                                ) : (
                                                    <RotateCcw className="size-3.5" />
                                                )}
                                                Restore intro
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="rounded-xl border border-white/[0.08] bg-[#221C2A]/50 p-4 ring-1 ring-inset ring-white/[0.04]">
                            <h2 className="text-sm font-semibold text-white">Match with someone else</h2>
                            <p className="mt-1 text-[12px] text-white/45">
                                Pick any second user if they are not in the list above.
                            </p>
                            <div className="relative mt-3">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                                <input
                                    value={partnerQuery}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setPartnerQuery(value);
                                        if (value.trim().length >= 2) {
                                            runSearch(value, "partner");
                                        } else {
                                            setPartnerResults([]);
                                        }
                                    }}
                                    placeholder="Partner name or email"
                                    className="w-full rounded-lg border border-white/[0.08] bg-[#141118] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#B8327A]/50"
                                />
                            </div>
                            <div className="mt-2 max-h-[200px] space-y-1 overflow-y-auto">
                                {partnerResults.map((row) => (
                                    <UserChip
                                        key={row.id}
                                        user={row}
                                        selected={manualPartner?.id === row.id}
                                        onClick={() => setManualPartner(row)}
                                    />
                                ))}
                            </div>
                            {manualPartner ? (
                                <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() => restoreWith(manualPartner)}
                                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#B8327A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {pending ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <RotateCcw className="size-4" />
                                    )}
                                    Restore intro with {manualPartner.name}
                                </button>
                            ) : null}
                        </section>
                    </>
                )}

                {message ? (
                    <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                        {message}
                    </p>
                ) : null}
                {error ? (
                    <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
