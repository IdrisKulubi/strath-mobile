"use client";

import { type ReactNode } from "react";
import { CalendarClock, MapPin } from "lucide-react";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { PairAvatars } from "./pair-avatars";
import { ContactRow } from "./contact-row";
import { DateFlowTimeline } from "./date-flow-timeline";
import { getVibeMeta, type OpsPairUser, type OpsStage } from "./types";
import { cn } from "@/lib/utils";

interface PairDetailSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userA: OpsPairUser;
    userB: OpsPairUser;
    vibe?: string | null;
    stage: OpsStage;
    scheduledAt?: string | null;
    venueName?: string | null;
    venueAddress?: string | null;
    status?: string | null;
    createdAt?: string | null;
    startedAt?: string | null;
    callCompleted?: boolean;
    userADecision?: string | null;
    userBDecision?: string | null;
    actions?: ReactNode;
    extraContent?: ReactNode;
}

export function PairDetailSheet({
    open,
    onOpenChange,
    userA,
    userB,
    vibe,
    stage,
    scheduledAt,
    venueName,
    venueAddress,
    status,
    createdAt,
    startedAt,
    callCompleted,
    userADecision,
    userBDecision,
    actions,
    extraContent,
}: PairDetailSheetProps) {
    const vibeMeta = getVibeMeta(vibe);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full border-white/[0.08] bg-[#0a0a14]/98 text-white backdrop-blur-xl sm:max-w-md"
            >
                <SheetHeader className="border-b border-white/[0.06] px-6 pt-6 pb-5">
                    <div
                        className={cn(
                            "pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b opacity-40",
                            vibeMeta.gradient
                        )}
                        aria-hidden
                    />
                    <div className="relative flex items-center gap-4">
                        <PairAvatars userA={userA} userB={userB} vibe={vibe} size="lg" />
                        <div className="min-w-0">
                            <SheetTitle className="text-xl font-semibold tracking-tight text-white">
                                {userA.firstName} × {userB.firstName}
                            </SheetTitle>
                            <SheetDescription className="mt-0.5 text-[12px] text-white/50">
                                <span className={vibeMeta.text}>{vibeMeta.emoji}</span> {vibeMeta.label} date
                                {status ? ` · ${status.replace("_", " ")}` : ""}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    <section className="mb-6">
                        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                            Date Flow
                        </h3>
                        <DateFlowTimeline steps={buildTimelineSteps({ stage, createdAt, startedAt, callCompleted, scheduledAt, status })} />
                    </section>

                    {(scheduledAt || venueName) && (
                        <section className="mb-6 space-y-2">
                            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                                Plan
                            </h3>
                            {scheduledAt && (
                                <div className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.04]">
                                    <CalendarClock className="mt-0.5 size-4 shrink-0 text-white/50" strokeWidth={1.75} />
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-white">
                                            {new Date(scheduledAt).toLocaleString("en-KE", {
                                                weekday: "long",
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                        <p className="text-[12px] text-white/40">{relativeTimeLabel(scheduledAt)}</p>
                                    </div>
                                </div>
                            )}
                            {venueName && (
                                <div className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.04]">
                                    <MapPin className="mt-0.5 size-4 shrink-0 text-white/50" strokeWidth={1.75} />
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-white">{venueName}</p>
                                        {venueAddress && (
                                            <p className="truncate text-[12px] text-white/40">{venueAddress}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {(userADecision || userBDecision) && (
                        <section className="mb-6">
                            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                                Post-call Decisions
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <DecisionChip name={userA.firstName} decision={userADecision} />
                                <DecisionChip name={userB.firstName} decision={userBDecision} />
                            </div>
                        </section>
                    )}

                    <section className="mb-6">
                        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                            Contact
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.04]">
                                <ContactRow user={userA} />
                            </div>
                            <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.04]">
                                <ContactRow user={userB} />
                            </div>
                        </div>
                    </section>

                    {extraContent}
                </div>

                {actions && (
                    <div className="sticky bottom-0 border-t border-white/[0.06] bg-[#0a0a14]/95 px-6 py-4 backdrop-blur">
                        {actions}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

function DecisionChip({ name, decision }: { name: string; decision?: string | null }) {
    const tone =
        decision === "meet"
            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
            : decision === "pass"
            ? "bg-rose-500/15 text-rose-300 ring-rose-400/30"
            : "bg-white/[0.03] text-white/50 ring-white/10";

    return (
        <div className={cn("flex items-center justify-between rounded-xl px-3 py-2 ring-1 ring-inset", tone)}>
            <span className="text-[12px] font-medium">{name}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide">
                {decision ? decision : "—"}
            </span>
        </div>
    );
}

interface TimelineArgs {
    stage: OpsStage;
    createdAt?: string | null;
    startedAt?: string | null;
    callCompleted?: boolean;
    scheduledAt?: string | null;
    status?: string | null;
}

function buildTimelineSteps({
    stage,
    createdAt,
    startedAt,
    callCompleted,
    scheduledAt,
    status,
}: TimelineArgs) {
    const steps: { label: string; detail?: string; status: "done" | "current" | "pending" | "skipped" }[] = [];

    steps.push({
        label: "Mutual match",
        detail: createdAt ? formatShort(createdAt) : undefined,
        status: "done",
    });

    steps.push({
        label: "Vibe call",
        detail: startedAt
            ? `Started ${formatShort(startedAt)}`
            : stage === "on-call"
            ? "In progress"
            : callCompleted
            ? "Completed"
            : "Scheduled",
        status: stage === "on-call" ? "current" : callCompleted || stage !== "on-call" ? "done" : "pending",
    });

    steps.push({
        label: "Arranging",
        detail: stage === "arranging" ? "Pick venue & time" : stage === "on-call" ? "Pending" : undefined,
        status:
            stage === "arranging"
                ? "current"
                : stage === "upcoming" || stage === "history"
                ? "done"
                : "pending",
    });

    steps.push({
        label: "Scheduled",
        detail: scheduledAt
            ? `${formatShort(scheduledAt)} · ${relativeTimeLabel(scheduledAt)}`
            : stage === "upcoming"
            ? "Date saved"
            : undefined,
        status:
            stage === "upcoming"
                ? "current"
                : stage === "history"
                ? "done"
                : "pending",
    });

    if (status === "cancelled" || status === "no_show") {
        steps.push({
            label: status === "cancelled" ? "Cancelled" : "No-show",
            status: "skipped",
        });
    } else {
        steps.push({
            label: "Attended",
            detail: status === "attended" ? "Confirmed in person" : undefined,
            status: status === "attended" ? "done" : "pending",
        });
    }

    return steps;
}

function formatShort(iso: string) {
    return new Date(iso).toLocaleString("en-KE", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function relativeTimeLabel(iso: string) {
    const target = new Date(iso).getTime();
    const now = Date.now();
    const diffMin = Math.round((target - now) / 60000);
    const absMin = Math.abs(diffMin);
    if (absMin < 1) return "now";
    if (absMin < 60) return diffMin >= 0 ? `in ${absMin} min` : `${absMin} min ago`;
    const diffH = Math.round(diffMin / 60);
    const absH = Math.abs(diffH);
    if (absH < 24) return diffH >= 0 ? `in ${absH} h` : `${absH} h ago`;
    const diffD = Math.round(diffH / 24);
    const absD = Math.abs(diffD);
    if (absD < 7) return diffD >= 0 ? `in ${absD} d` : `${absD} d ago`;
    return new Date(iso).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}
