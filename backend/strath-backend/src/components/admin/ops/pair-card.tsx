"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PairAvatars } from "./pair-avatars";
import { getVibeMeta, type OpsPairUser, type OpsStage } from "./types";

interface PairCardProps {
    userA: OpsPairUser;
    userB: OpsPairUser;
    vibe?: string | null;
    stage: OpsStage;
    statusChip?: ReactNode;
    metaRow?: ReactNode;
    body?: ReactNode;
    footer?: ReactNode;
    onOpen?: () => void;
    className?: string;
}

export function PairCard({
    userA,
    userB,
    vibe,
    statusChip,
    metaRow,
    body,
    footer,
    onOpen,
    className,
}: PairCardProps) {
    const vibeMeta = getVibeMeta(vibe);

    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.015] backdrop-blur-xl transition-all",
                "hover:border-white/[0.12] hover:from-white/[0.05] hover:to-white/[0.02] hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]",
                className
            )}
        >
            <div
                className={cn(
                    "pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-gradient-to-br opacity-30 blur-3xl transition-opacity group-hover:opacity-50",
                    vibeMeta.gradient
                )}
                aria-hidden
            />

            <div className="relative p-5">
                <div className="flex items-start justify-between gap-4">
                    <button
                        type="button"
                        onClick={onOpen}
                        className="flex min-w-0 items-center gap-4 text-left"
                        aria-label={`Open ${userA.firstName} and ${userB.firstName} details`}
                    >
                        <PairAvatars userA={userA} userB={userB} vibe={vibe} size="md" />
                        <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-white">
                                {userA.firstName} <span className="text-white/40">×</span> {userB.firstName}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                                        vibeMeta.chipBg,
                                        vibeMeta.chipBorder,
                                        vibeMeta.text
                                    )}
                                >
                                    <span className="text-[11px] leading-none">{vibeMeta.emoji}</span>
                                    <span>{vibeMeta.label}</span>
                                </span>
                                {metaRow}
                            </div>
                        </div>
                    </button>

                    {statusChip && <div className="shrink-0">{statusChip}</div>}
                </div>

                {body && <div className="mt-4">{body}</div>}
            </div>

            {footer && (
                <div className="relative border-t border-white/[0.06] bg-white/[0.015] px-5 py-3">{footer}</div>
            )}
        </div>
    );
}

/** Reusable compact info tile for pair contact / location details. */
export function PairInfoTile({
    label,
    children,
    className,
}: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-inset ring-white/[0.04]", className)}>
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-white/40">{label}</p>
            <div className="text-[13px] text-white/80">{children}</div>
        </div>
    );
}
