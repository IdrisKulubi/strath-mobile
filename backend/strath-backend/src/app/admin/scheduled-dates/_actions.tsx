"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, MapPin, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { PairCard, PairInfoTile } from "@/components/admin/ops/pair-card";
import { PairDetailSheet } from "@/components/admin/ops/pair-detail-sheet";
import { EmptyState } from "@/components/admin/ops/empty-state";
import { OpsHeader } from "@/components/admin/ops/ops-header";
import { CountdownChip } from "@/components/admin/ops/countdown-chip";
import { StatusActionButtons } from "@/components/admin/ops/status-action-buttons";
import type { OpsScheduledPair } from "@/components/admin/ops/types";

interface UpcomingViewProps {
    rows: OpsScheduledPair[];
    isDemo: boolean;
}

export function UpcomingView({ rows: initialRows, isDemo }: UpcomingViewProps) {
    const [rows, setRows] = useState(initialRows);
    const [detailId, setDetailId] = useState<string | null>(null);

    const detail = useMemo(() => rows.find((r) => r.id === detailId) ?? null, [rows, detailId]);

    const handleDemoStatus = (matchId: string, nextStatus: string) => {
        setRows((prev) =>
            nextStatus === "scheduled"
                ? prev.map((r) => (r.id === matchId ? { ...r, status: nextStatus } : r))
                : prev.filter((r) => r.id !== matchId)
        );
    };

    return (
        <div className="mx-auto max-w-6xl p-6 md:p-10">
            <OpsHeader
                stage="upcoming"
                title="Upcoming"
                description={`date${rows.length !== 1 ? "s" : ""} scheduled — track them until they meet.`}
                count={rows.length}
                isDemo={isDemo}
            />

            {rows.length === 0 ? (
                <EmptyState
                    icon={CalendarCheck2}
                    title="No upcoming dates"
                    description="Dates you schedule in Arranging will appear here with a countdown until they happen. After the date, mark it as Attended to move it to History."
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {rows.map((pair) => {
                        const pairLabel = `${pair.userA.firstName} × ${pair.userB.firstName}`;
                        return (
                            <PairCard
                                key={pair.id}
                                stage="upcoming"
                                userA={pair.userA}
                                userB={pair.userB}
                                vibe={pair.vibe}
                                onOpen={() => setDetailId(pair.id)}
                                statusChip={<CountdownChip target={pair.scheduledAt} />}
                                metaRow={
                                    <span className="truncate text-[11px] text-white/40">
                                        {pair.scheduledAt
                                            ? new Date(pair.scheduledAt).toLocaleString("en-KE", {
                                                  weekday: "short",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                              })
                                            : "Time not set"}
                                    </span>
                                }
                                body={
                                    <div className="space-y-2">
                                        <PairInfoTile label="Venue">
                                            {pair.venueName ? (
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-white/40" strokeWidth={1.75} />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[13px] text-white">{pair.venueName}</p>
                                                        {pair.venueAddress && (
                                                            <p className="truncate text-[11px] text-white/40">
                                                                {pair.venueAddress}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[12px] text-amber-300/70">No venue set</span>
                                            )}
                                        </PairInfoTile>

                                        <PairInfoTile label="Feedback">
                                            <FeedbackSummary
                                                count={pair.feedbackCount}
                                                avgRating={pair.avgRating}
                                            />
                                        </PairInfoTile>
                                    </div>
                                }
                                footer={
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] text-white/50">
                                            {pair.scheduledAt && Date.now() > new Date(pair.scheduledAt).getTime()
                                                ? "Date should have happened — confirm outcome"
                                                : "After the date, mark the outcome"}
                                        </p>
                                        <StatusActionButtons
                                            matchId={pair.id}
                                            current={pair.status}
                                            variant="upcoming"
                                            pairLabel={pairLabel}
                                            isDemo={isDemo}
                                            onDemoUpdate={(s) => handleDemoStatus(pair.id, s)}
                                        />
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            {detail && (
                <PairDetailSheet
                    open={!!detailId}
                    onOpenChange={(o) => !o && setDetailId(null)}
                    userA={detail.userA}
                    userB={detail.userB}
                    vibe={detail.vibe}
                    stage="upcoming"
                    createdAt={detail.createdAt}
                    callCompleted
                    scheduledAt={detail.scheduledAt}
                    venueName={detail.venueName}
                    venueAddress={detail.venueAddress}
                    status={detail.status}
                    dateMatchId={detail.id}
                    actions={
                        <StatusActionButtons
                            matchId={detail.id}
                            current={detail.status}
                            variant="upcoming"
                            pairLabel={`${detail.userA.firstName} × ${detail.userB.firstName}`}
                            isDemo={isDemo}
                            onDemoUpdate={(s) => {
                                handleDemoStatus(detail.id, s);
                                setDetailId(null);
                            }}
                        />
                    }
                />
            )}
        </div>
    );
}

function FeedbackSummary({ count, avgRating }: { count: number; avgRating: number | null }) {
    if (count === 0) {
        return <span className="text-[12px] text-white/50">Awaiting after date</span>;
    }
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                        key={i}
                        className={cn(
                            "size-3",
                            avgRating != null && i <= Math.round(avgRating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-white/10 text-white/20"
                        )}
                    />
                ))}
            </div>
            <span className="text-[11px] text-white/50">
                {avgRating != null ? `${avgRating.toFixed(1)} · ` : ""}
                {count}/2 submitted
            </span>
        </div>
    );
}
