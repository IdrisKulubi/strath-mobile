"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CalendarPlus, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { PairCard, PairInfoTile } from "@/components/admin/ops/pair-card";
import { PairDetailSheet } from "@/components/admin/ops/pair-detail-sheet";
import { ScheduleDateSheet } from "@/components/admin/ops/schedule-date-sheet";
import { EmptyState } from "@/components/admin/ops/empty-state";
import { OpsHeader } from "@/components/admin/ops/ops-header";
import type { OpsLocation, OpsPendingPair } from "@/components/admin/ops/types";

interface ArrangingViewProps {
    rows: OpsPendingPair[];
    locations: OpsLocation[];
    isDemo: boolean;
}

export function ArrangingView({ rows: initialRows, locations, isDemo }: ArrangingViewProps) {
    const [rows, setRows] = useState(initialRows);
    const [scheduleId, setScheduleId] = useState<string | null>(null);
    const [detailId, setDetailId] = useState<string | null>(null);

    const scheduleTarget = useMemo(
        () => rows.find((r) => r.id === scheduleId) ?? null,
        [rows, scheduleId]
    );
    const detailTarget = useMemo(
        () => rows.find((r) => r.id === detailId) ?? null,
        [rows, detailId]
    );

    const handleScheduled = (matchId: string) => {
        if (isDemo) {
            setRows((prev) => prev.filter((r) => r.id !== matchId));
        }
        setScheduleId(null);
    };

    return (
        <div className="mx-auto max-w-6xl p-6 md:p-10">
            <OpsHeader
                stage="arranging"
                title="Arranging"
                description={`pair${rows.length !== 1 ? "s" : ""} agreed to meet — pick a venue and time.`}
                count={rows.length}
                isDemo={isDemo}
            />

            {rows.length === 0 ? (
                <EmptyState
                    icon={CalendarClock}
                    title="All clear"
                    description="No agreed pairs are waiting on a manual setup right now. When both people finish a vibe call and tap 'Meet up', they'll show here."
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {rows.map((pair) => (
                        <PairCard
                            key={pair.id}
                            stage="arranging"
                            userA={pair.userA}
                            userB={pair.userB}
                            vibe={pair.vibe}
                            onOpen={() => setDetailId(pair.id)}
                            statusChip={
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-200 ring-1 ring-inset ring-amber-400/30">
                                    <Clock3 className="size-3" />
                                    Awaiting setup
                                </span>
                            }
                            metaRow={
                                <span className="text-[11px] text-white/40">
                                    Agreed {relativeAgo(pair.createdAt)}
                                </span>
                            }
                            body={
                                <div className="grid grid-cols-2 gap-2">
                                    <PairInfoTile label={pair.userA.firstName}>
                                        <ContactSummary phone={pair.userA.phone} email={pair.userA.email} />
                                    </PairInfoTile>
                                    <PairInfoTile label={pair.userB.firstName}>
                                        <ContactSummary phone={pair.userB.phone} email={pair.userB.email} />
                                    </PairInfoTile>
                                </div>
                            }
                            footer={
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] text-white/50">
                                        Both confirmed they want to meet
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setScheduleId(pair.id)}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-black shadow-lg transition-all hover:bg-white/90"
                                    >
                                        <CalendarPlus className="size-3.5" />
                                        Schedule date
                                    </button>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            {scheduleTarget && (
                <ScheduleDateSheet
                    open={!!scheduleId}
                    onOpenChange={(o) => !o && setScheduleId(null)}
                    matchId={scheduleTarget.id}
                    userA={scheduleTarget.userA}
                    userB={scheduleTarget.userB}
                    vibe={scheduleTarget.vibe}
                    locations={locations}
                    isDemo={isDemo}
                    onScheduled={() => handleScheduled(scheduleTarget.id)}
                />
            )}

            {detailTarget && (
                <PairDetailSheet
                    open={!!detailId}
                    onOpenChange={(o) => !o && setDetailId(null)}
                    userA={detailTarget.userA}
                    userB={detailTarget.userB}
                    vibe={detailTarget.vibe}
                    stage="arranging"
                    createdAt={detailTarget.createdAt}
                    callCompleted
                    dateMatchId={detailTarget.id}
                    actions={
                        <button
                            type="button"
                            onClick={() => {
                                setDetailId(null);
                                setScheduleId(detailTarget.id);
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-black shadow-lg transition-all hover:bg-white/90"
                        >
                            <CalendarPlus className="size-4" />
                            Schedule this date
                        </button>
                    }
                />
            )}
        </div>
    );
}

function ContactSummary({ phone, email }: { phone?: string | null; email?: string | null }) {
    if (!phone?.trim() && !email?.trim()) {
        return <span className="text-[12px] text-amber-300/70">No contact on file</span>;
    }
    return (
        <div className="space-y-0.5">
            {phone?.trim() ? (
                <p className="truncate text-[12px] text-white/70">{phone}</p>
            ) : (
                <p className="text-[11px] text-amber-300/70">No phone</p>
            )}
            {email?.trim() ? (
                <p className={cn("truncate text-[11px]", "text-white/40")}>{email}</p>
            ) : null}
        </div>
    );
}

function relativeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}
