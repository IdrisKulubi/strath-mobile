"use client";

import { useTransition } from "react";
import { updateDateMatchStatus } from "@/lib/actions/admin";

const STATUS_OPTIONS = ["scheduled", "attended", "cancelled", "no_show"] as const;
const LABELS: Record<string, string> = {
    scheduled: "Scheduled",
    attended: "Attended",
    cancelled: "Cancelled",
    no_show: "No-show",
};
const COLORS: Record<string, string> = {
    scheduled: "bg-blue-600 hover:bg-blue-700",
    attended: "bg-green-600 hover:bg-green-700",
    cancelled: "bg-red-600 hover:bg-red-700",
    no_show: "bg-orange-600 hover:bg-orange-700",
};

export function StatusUpdateButtons({ matchId, current }: { matchId: string; current: string }) {
    const [isPending, startTransition] = useTransition();

    const handleUpdate = (status: string) => {
        startTransition(() => updateDateMatchStatus(matchId, status));
    };

    return (
        <div className="flex gap-1.5 flex-wrap">
            {STATUS_OPTIONS.filter((s) => s !== current).map((s) => (
                <button
                    key={s}
                    onClick={() => handleUpdate(s)}
                    disabled={isPending}
                    className={`px-2.5 py-1 text-xs font-medium text-white rounded-md transition-colors disabled:opacity-50 ${COLORS[s]}`}
                >
                    {LABELS[s]}
                </button>
            ))}
        </div>
    );
}
