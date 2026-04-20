"use client";

import { useState } from "react";
import { PhoneCall } from "lucide-react";

import { cn } from "@/lib/utils";
import { PairCard, PairInfoTile } from "./pair-card";
import { PairDetailSheet } from "./pair-detail-sheet";
import type { OpsOnCallSession } from "./types";

interface OnCallCardProps {
    session: OpsOnCallSession;
}

const STATUS_TONES: Record<string, { label: string; chip: string; dot: string; pulse: boolean }> = {
    pending: {
        label: "Waiting",
        chip: "bg-yellow-500/15 text-yellow-200 ring-yellow-400/30",
        dot: "bg-yellow-400",
        pulse: false,
    },
    scheduled: {
        label: "Invited",
        chip: "bg-blue-500/15 text-blue-200 ring-blue-400/30",
        dot: "bg-blue-400",
        pulse: false,
    },
    active: {
        label: "Live",
        chip: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
        dot: "bg-emerald-400",
        pulse: true,
    },
};

export function OnCallCard({ session }: OnCallCardProps) {
    const [open, setOpen] = useState(false);
    const status = session.status ?? "pending";
    const tone = STATUS_TONES[status] ?? STATUS_TONES.pending;

    return (
        <>
            <PairCard
                stage="on-call"
                userA={session.userA}
                userB={session.userB}
                onOpen={() => setOpen(true)}
                statusChip={
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                            tone.chip
                        )}
                    >
                        <span className="relative flex size-1.5">
                            {tone.pulse && (
                                <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", tone.dot)} />
                            )}
                            <span className={cn("relative inline-flex size-1.5 rounded-full", tone.dot)} />
                        </span>
                        {tone.label}
                    </span>
                }
                metaRow={
                    <span className="truncate text-[11px] text-white/40">Room · {session.roomName}</span>
                }
                body={
                    <div className="grid grid-cols-2 gap-2">
                        <PairInfoTile label="Invited">
                            {session.scheduledAt
                                ? new Date(session.scheduledAt).toLocaleTimeString("en-KE", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  })
                                : "—"}
                        </PairInfoTile>
                        <PairInfoTile label="Started">
                            {session.startedAt
                                ? new Date(session.startedAt).toLocaleTimeString("en-KE", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  })
                                : "Not yet"}
                        </PairInfoTile>
                    </div>
                }
                footer={
                    <div className="flex items-center justify-between text-[11px] text-white/50">
                        <div className="flex items-center gap-2">
                            <PhoneCall className="size-3 text-white/40" />
                            <span>
                                {session.callCompleted
                                    ? "Call completed"
                                    : status === "active"
                                    ? "Call in progress"
                                    : "Call not started"}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <DecisionDot name={session.userA.firstName} decision={session.user1Decision} />
                            <DecisionDot name={session.userB.firstName} decision={session.user2Decision} />
                        </div>
                    </div>
                }
            />

            <PairDetailSheet
                open={open}
                onOpenChange={setOpen}
                userA={session.userA}
                userB={session.userB}
                stage="on-call"
                createdAt={session.createdAt}
                startedAt={session.startedAt}
                callCompleted={session.callCompleted}
                userADecision={session.user1Decision}
                userBDecision={session.user2Decision}
                status={status}
            />
        </>
    );
}

function DecisionDot({ name, decision }: { name: string; decision: string | null }) {
    const tone =
        decision === "meet"
            ? "bg-emerald-400"
            : decision === "pass"
            ? "bg-rose-400"
            : "bg-white/20";
    return (
        <span
            title={`${name}: ${decision ?? "pending"}`}
            className={cn("inline-flex size-2 rounded-full", tone)}
        />
    );
}
