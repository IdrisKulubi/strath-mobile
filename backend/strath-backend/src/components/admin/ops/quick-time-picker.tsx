"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    formatNairobiDateTime,
    getNairobiNowParts,
    nairobiPresetInstant,
    toNairobiDateTimeLocalInput,
} from "@/lib/nairobi-datetime";

interface QuickTimePickerProps {
    value: string | null;
    onChange: (isoLocal: string) => void;
}

interface QuickPreset {
    id: string;
    label: string;
    sublabel: string;
    isoLocal: string;
}

export function QuickTimePicker({ value, onChange }: QuickTimePickerProps) {
    const presets = useMemo(() => buildPresets(), []);
    const [custom, setCustom] = useState(false);

    const isCustom =
        custom ||
        (value !== null && !presets.some((p) => p.isoLocal === value));

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => {
                    const selected = value === preset.isoLocal && !isCustom;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                                setCustom(false);
                                onChange(preset.isoLocal);
                            }}
                            className={cn(
                                "rounded-2xl border px-3 py-2.5 text-left transition-all",
                                selected
                                    ? "border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                                    : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.05]"
                            )}
                        >
                            <p className="text-[13px] font-medium text-white">{preset.label}</p>
                            <p className="mt-0.5 text-[11px] text-white/50">{preset.sublabel}</p>
                        </button>
                    );
                })}

                <button
                    type="button"
                    onClick={() => setCustom(true)}
                    className={cn(
                        "col-span-2 flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-all",
                        isCustom
                            ? "border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.05]"
                    )}
                >
                    <CalendarDays className="size-4 text-white/60" strokeWidth={1.75} />
                    <span className="text-[13px] font-medium text-white">Custom date & time</span>
                </button>
            </div>

            {isCustom && (
                <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.04]">
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                        Pick a custom slot (Nairobi time)
                    </label>
                    <input
                        type="datetime-local"
                        value={value ?? ""}
                        min={minDateTimeLocal()}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[14px] text-white outline-none focus:border-emerald-400/50"
                    />
                </div>
            )}
        </div>
    );
}

function buildPresets(): QuickPreset[] {
    const now = new Date();
    const parts = getNairobiNowParts();

    const tonight = nairobiPresetInstant(parts, 0, 19, 0);
    const tomorrow = nairobiPresetInstant(parts, 1, 18, 0);
    const saturday = nairobiPresetInstant(parts, daysUntilWeekday(parts, 6), 14, 0);
    const nextFriday = nairobiPresetInstant(parts, daysUntilWeekday(parts, 5), 18, 30);

    const presets: QuickPreset[] = [];
    if (tonight > now) {
        presets.push(makePreset("tonight", "Tonight · 7:00 pm", tonight));
    }
    presets.push(makePreset("tomorrow", "Tomorrow · 6:00 pm", tomorrow));
    presets.push(makePreset("saturday", "Saturday · 2:00 pm", saturday));
    presets.push(makePreset("friday", "Friday · 6:30 pm", nextFriday));
    return presets.slice(0, 4);
}

function makePreset(id: string, label: string, instant: Date): QuickPreset {
    return {
        id,
        label,
        sublabel: formatNairobiDateTime(instant, {
            weekday: "short",
            month: "short",
            day: "numeric",
        }),
        isoLocal: toNairobiDateTimeLocalInput(instant),
    };
}

function daysUntilWeekday(parts: ReturnType<typeof getNairobiNowParts>, targetDay: number) {
    let diff = (targetDay - parts.dayOfWeek + 7) % 7;
    if (diff === 0) diff = 7;
    return diff;
}

function minDateTimeLocal() {
    return toNairobiDateTimeLocalInput(new Date());
}
