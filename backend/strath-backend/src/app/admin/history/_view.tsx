"use client";

import { useMemo, useState } from "react";
import { Clock3, MapPin, Star, UserX, XCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { PairAvatars } from "@/components/admin/ops/pair-avatars";
import { PairDetailSheet } from "@/components/admin/ops/pair-detail-sheet";
import { EmptyState } from "@/components/admin/ops/empty-state";
import { OpsHeader } from "@/components/admin/ops/ops-header";
import { StatusActionButtons } from "@/components/admin/ops/status-action-buttons";
import { getVibeMeta, type OpsHistoryPair } from "@/components/admin/ops/types";

interface HistoryViewProps {
    rows: OpsHistoryPair[];
    isDemo: boolean;
}

const OUTCOME_META: Record<string, { label: string; icon: typeof CheckCircle2; chip: string }> = {
    attended: {
        label: "Attended",
        icon: CheckCircle2,
        chip: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
    },
    cancelled: {
        label: "Cancelled",
        icon: XCircle,
        chip: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
    },
    no_show: {
        label: "No-show",
        icon: UserX,
        chip: "bg-orange-500/15 text-orange-200 ring-orange-400/30",
    },
};

export function HistoryView({ rows: initialRows, isDemo }: HistoryViewProps) {
    const [rows, setRows] = useState(initialRows);
    const [filter, setFilter] = useState<"all" | "attended" | "cancelled" | "no_show">("all");
    const [detailId, setDetailId] = useState<string | null>(null);

    const detail = useMemo(() => rows.find((r) => r.id === detailId) ?? null, [rows, detailId]);

    const filtered = useMemo(() => {
        if (filter === "all") return rows;
        return rows.filter((r) => r.status === filter);
    }, [rows, filter]);

    const counts = useMemo(
        () => ({
            all: rows.length,
            attended: rows.filter((r) => r.status === "attended").length,
            cancelled: rows.filter((r) => r.status === "cancelled").length,
            no_show: rows.filter((r) => r.status === "no_show").length,
        }),
        [rows]
    );

    const groups = useMemo(() => groupByMonth(filtered), [filtered]);

    const handleDemoStatus = (matchId: string, nextStatus: string) => {
        setRows((prev) =>
            nextStatus === "scheduled"
                ? prev.filter((r) => r.id !== matchId)
                : prev.map((r) => (r.id === matchId ? { ...r, status: nextStatus } : r))
        );
    };

    return (
        <div className="mx-auto max-w-5xl p-6 md:p-10">
            <OpsHeader
                stage="history"
                title="History"
                description={`completed, cancelled, or no-show date${rows.length !== 1 ? "s" : ""}.`}
                count={rows.length}
                isDemo={isDemo}
            />

            <div className="mb-6 flex flex-wrap gap-2">
                <FilterChip label="All" active={filter === "all"} count={counts.all} onClick={() => setFilter("all")} />
                <FilterChip
                    label="Attended"
                    active={filter === "attended"}
                    count={counts.attended}
                    onClick={() => setFilter("attended")}
                    tone="emerald"
                />
                <FilterChip
                    label="Cancelled"
                    active={filter === "cancelled"}
                    count={counts.cancelled}
                    onClick={() => setFilter("cancelled")}
                    tone="rose"
                />
                <FilterChip
                    label="No-show"
                    active={filter === "no_show"}
                    count={counts.no_show}
                    onClick={() => setFilter("no_show")}
                    tone="orange"
                />
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    icon={Clock3}
                    title={filter === "all" ? "No date history yet" : `No ${filter.replace("_", " ")} dates`}
                    description="Once you mark an Upcoming date as Attended, Cancelled, or No-show it shows here."
                />
            ) : (
                <div className="space-y-6">
                    {groups.map((group) => (
                        <section key={group.key}>
                            <div className="mb-3 flex items-center gap-3">
                                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                                    {group.label}
                                </h2>
                                <div className="h-px flex-1 bg-white/[0.06]" />
                                <span className="text-[11px] tabular-nums text-white/30">
                                    {group.items.length}
                                </span>
                            </div>

                            <ol className="overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02]">
                                {group.items.map((pair, idx) => (
                                    <HistoryRow
                                        key={pair.id}
                                        pair={pair}
                                        isLast={idx === group.items.length - 1}
                                        onOpen={() => setDetailId(pair.id)}
                                        isDemo={isDemo}
                                        onDemoUpdate={(s) => handleDemoStatus(pair.id, s)}
                                    />
                                ))}
                            </ol>
                        </section>
                    ))}
                </div>
            )}

            {detail && (
                <PairDetailSheet
                    open={!!detailId}
                    onOpenChange={(o) => !o && setDetailId(null)}
                    userA={detail.userA}
                    userB={detail.userB}
                    vibe={detail.vibe}
                    stage="history"
                    createdAt={detail.createdAt}
                    callCompleted
                    scheduledAt={detail.scheduledAt}
                    venueName={detail.venueName}
                    venueAddress={detail.venueAddress}
                    status={detail.status}
                    extraContent={
                        detail.feedbackCount > 0 ? (
                            <section className="mb-6">
                                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                                    Feedback
                                </h3>
                                <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.04]">
                                    <FeedbackRow count={detail.feedbackCount} avg={detail.avgRating} />
                                </div>
                            </section>
                        ) : null
                    }
                    actions={
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[12px] text-white/50">Revert or change outcome</p>
                            <StatusActionButtons
                                matchId={detail.id}
                                current={detail.status}
                                variant="history"
                                pairLabel={`${detail.userA.firstName} × ${detail.userB.firstName}`}
                                isDemo={isDemo}
                                onDemoUpdate={(s) => {
                                    handleDemoStatus(detail.id, s);
                                    if (s === "scheduled") setDetailId(null);
                                }}
                            />
                        </div>
                    }
                />
            )}
        </div>
    );
}

function HistoryRow({
    pair,
    isLast,
    onOpen,
    isDemo,
    onDemoUpdate,
}: {
    pair: OpsHistoryPair;
    isLast: boolean;
    onOpen: () => void;
    isDemo: boolean;
    onDemoUpdate: (nextStatus: string) => void;
}) {
    const outcome = OUTCOME_META[pair.status] ?? OUTCOME_META.attended;
    const OutcomeIcon = outcome.icon;
    const vibeMeta = getVibeMeta(pair.vibe);

    return (
        <li
            className={cn(
                "group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.02]",
                !isLast && "border-b border-white/[0.04]"
            )}
        >
            <button
                type="button"
                onClick={onOpen}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
            >
                <PairAvatars userA={pair.userA} userB={pair.userB} vibe={pair.vibe} size="sm" />

                <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-white">
                        {pair.userA.firstName} <span className="text-white/30">×</span> {pair.userB.firstName}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45">
                        <span className={vibeMeta.text}>{vibeMeta.emoji}</span>
                        <span>{vibeMeta.label}</span>
                        {pair.venueName && (
                            <>
                                <span className="text-white/20">·</span>
                                <MapPin className="size-3 text-white/30" />
                                <span className="truncate">{pair.venueName}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="hidden w-32 text-right text-[11px] text-white/40 sm:block">
                    {pair.scheduledAt
                        ? new Date(pair.scheduledAt).toLocaleDateString("en-KE", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                          })
                        : "—"}
                </div>

                <div className="hidden w-28 sm:block">
                    <FeedbackRow count={pair.feedbackCount} avg={pair.avgRating} dense />
                </div>

                <span
                    className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                        outcome.chip
                    )}
                >
                    <OutcomeIcon className="size-3" />
                    {outcome.label}
                </span>
            </button>

            <StatusActionButtons
                matchId={pair.id}
                current={pair.status}
                variant="history"
                pairLabel={`${pair.userA.firstName} × ${pair.userB.firstName}`}
                isDemo={isDemo}
                onDemoUpdate={onDemoUpdate}
            />
        </li>
    );
}

function FeedbackRow({ count, avg, dense }: { count: number; avg: number | null; dense?: boolean }) {
    if (count === 0) {
        return <span className={cn("text-white/35", dense ? "text-[11px]" : "text-[12px]")}>No feedback</span>;
    }
    return (
        <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                        key={i}
                        className={cn(
                            "size-3",
                            avg != null && i <= Math.round(avg)
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-white/10 text-white/15"
                        )}
                    />
                ))}
            </div>
            <span className="text-[11px] text-white/50">
                {avg != null ? avg.toFixed(1) : ""}
                <span className="ml-1 text-white/30">· {count}/2</span>
            </span>
        </div>
    );
}

function FilterChip({
    label,
    count,
    active,
    onClick,
    tone,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    tone?: "emerald" | "rose" | "orange";
}) {
    const toneMap: Record<string, string> = {
        emerald: "data-[active=true]:bg-emerald-500/20 data-[active=true]:text-emerald-200 data-[active=true]:ring-emerald-400/30",
        rose: "data-[active=true]:bg-rose-500/20 data-[active=true]:text-rose-200 data-[active=true]:ring-rose-400/30",
        orange: "data-[active=true]:bg-orange-500/20 data-[active=true]:text-orange-200 data-[active=true]:ring-orange-400/30",
    };
    const activeTone = tone ? toneMap[tone] : "data-[active=true]:bg-white data-[active=true]:text-black";

    return (
        <button
            type="button"
            data-active={active}
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/60 ring-1 ring-inset ring-transparent transition-all hover:text-white",
                activeTone
            )}
        >
            <span>{label}</span>
            <span className="tabular-nums text-[11px] opacity-60">{count}</span>
        </button>
    );
}

function groupByMonth(rows: OpsHistoryPair[]) {
    const map = new Map<string, { key: string; label: string; items: OpsHistoryPair[] }>();
    for (const row of rows) {
        const anchor = row.scheduledAt ?? row.createdAt;
        const d = new Date(anchor);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
        const bucket = map.get(key) ?? { key, label, items: [] };
        bucket.items.push(row);
        map.set(key, bucket);
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
}
