"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CountdownChipProps {
    target: string | null;
    className?: string;
}

export function CountdownChip({ target, className }: CountdownChipProps) {
    const [label, setLabel] = useState(() => formatLabel(target));
    const [tone, setTone] = useState(() => getTone(target));

    useEffect(() => {
        if (!target) return;
        const id = window.setInterval(() => {
            setLabel(formatLabel(target));
            setTone(getTone(target));
        }, 30_000);
        return () => window.clearInterval(id);
    }, [target]);

    if (!target) {
        return (
            <span className={cn("inline-flex items-center rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/50 ring-1 ring-inset ring-white/10", className)}>
                No time set
            </span>
        );
    }

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset tabular-nums",
                tone,
                className
            )}
        >
            <span className="size-1.5 rounded-full bg-current opacity-70" />
            {label}
        </span>
    );
}

function getTone(target: string | null) {
    if (!target) return "bg-white/[0.04] text-white/50 ring-white/10";
    const diff = new Date(target).getTime() - Date.now();
    if (diff < 0) return "bg-orange-500/15 text-orange-200 ring-orange-400/30";
    if (diff < 2 * 60 * 60 * 1000) return "bg-rose-500/15 text-rose-200 ring-rose-400/30";
    if (diff < 24 * 60 * 60 * 1000) return "bg-amber-500/15 text-amber-200 ring-amber-400/30";
    return "bg-blue-500/15 text-blue-200 ring-blue-400/30";
}

function formatLabel(target: string | null) {
    if (!target) return "";
    const diff = new Date(target).getTime() - Date.now();
    const abs = Math.abs(diff);
    const past = diff < 0;

    const min = Math.round(abs / 60_000);
    if (min < 1) return past ? "just now" : "any moment";
    if (min < 60) return past ? `${min} min ago` : `in ${min} min`;

    const h = Math.round(min / 60);
    if (h < 24) return past ? `${h}h ago` : `in ${h}h ${min % 60}m`.replace(" 0m", "");

    const d = Math.round(h / 24);
    if (d < 7) return past ? `${d}d ago` : `in ${d}d`;

    const date = new Date(target);
    return date.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}
