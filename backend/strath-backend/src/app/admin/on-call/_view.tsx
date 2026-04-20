"use client";

import { PhoneCall } from "lucide-react";

import { EmptyState } from "@/components/admin/ops/empty-state";
import { OnCallCard } from "@/components/admin/ops/on-call-card";
import { OpsHeader } from "@/components/admin/ops/ops-header";
import type { OpsOnCallSession } from "@/components/admin/ops/types";

interface OnCallViewProps {
    rows: OpsOnCallSession[];
    isDemo: boolean;
}

export function OnCallView({ rows, isDemo }: OnCallViewProps) {
    const liveCount = rows.filter((r) => r.status === "active").length;

    return (
        <div className="mx-auto max-w-6xl p-6 md:p-10">
            <OpsHeader
                stage="on-call"
                title="On Call"
                description={`vibe check${rows.length !== 1 ? "s" : ""} currently waiting, invited, or live.`}
                count={rows.length}
                isDemo={isDemo}
                actions={
                    liveCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-200 ring-1 ring-inset ring-emerald-400/30">
                            <span className="relative flex size-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                            </span>
                            {liveCount} live
                        </span>
                    ) : null
                }
            />

            {rows.length === 0 ? (
                <EmptyState
                    icon={PhoneCall}
                    title="No live call sessions"
                    description="Vibe checks in progress will appear here. Waiting, invited, and active calls all show up in real time."
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {rows.map((session) => (
                        <OnCallCard key={session.id} session={session} />
                    ))}
                </div>
            )}
        </div>
    );
}
