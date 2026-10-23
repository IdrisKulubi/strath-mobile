"use client";

import { Check, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVibeMeta, type OpsLocation } from "./types";

interface LocationPickerGridProps {
    locations: OpsLocation[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    pairVibe?: string | null;
}

export function LocationPickerGrid({ locations, selectedId, onSelect, pairVibe }: LocationPickerGridProps) {
    if (locations.length === 0) {
        return (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-[13px] text-amber-200">
                Add at least one saved location before scheduling.
            </div>
        );
    }

    const sorted = [...locations].sort((a, b) => {
        const aMatch = pairVibe && a.vibe === pairVibe ? 1 : 0;
        const bMatch = pairVibe && b.vibe === pairVibe ? 1 : 0;
        return bMatch - aMatch;
    });

    return (
        <div className="grid grid-cols-1 gap-2">
            {sorted.map((loc) => {
                const selected = loc.id === selectedId;
                const matchesVibe = pairVibe && loc.vibe === pairVibe;
                const meta = getVibeMeta(loc.vibe);

                return (
                    <button
                        key={loc.id}
                        type="button"
                        onClick={() => onSelect(loc.id)}
                        className={cn(
                            "group relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all",
                            selected
                                ? "border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_8px_24px_-8px_rgba(16,185,129,0.4)]"
                                : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.05]"
                        )}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                                <div
                                    className={cn(
                                        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset",
                                        meta.gradient,
                                        meta.ring
                                    )}
                                >
                                    <span className="text-base">{meta.emoji}</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="truncate text-[14px] font-medium text-white">{loc.name}</p>
                                        {matchesVibe && (
                                            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/70">
                                                <Sparkles className="size-2.5" /> Match
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-white/50">
                                        <MapPin className="size-3 shrink-0 text-white/40" strokeWidth={1.75} />
                                        <span className="truncate">{loc.address}</span>
                                    </p>
                                    {loc.notes && (
                                        <p className="mt-1 line-clamp-1 text-[11px] text-white/40">{loc.notes}</p>
                                    )}
                                </div>
                            </div>
                            <span
                                className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded-full ring-1 transition-all",
                                    selected
                                        ? "bg-emerald-500 ring-emerald-400"
                                        : "bg-transparent ring-white/20 group-hover:ring-white/40"
                                )}
                            >
                                {selected && <Check className="size-3 text-white" strokeWidth={3} />}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
