"use client";

import { useState, useTransition } from "react";
import { scheduleDate } from "@/lib/actions/admin";

type DateLocationOption = {
    id: string;
    name: string;
    address: string;
    vibe: string | null;
};

export function ScheduleDateForm({
    matchId,
    locations,
}: {
    matchId: string;
    locations: DateLocationOption[];
}) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        formData.set("matchId", matchId);
        startTransition(async () => {
            try {
                await scheduleDate(formData);
                setOpen(false);
            } catch (e: any) {
                setError(e.message ?? "Failed to schedule");
            }
        });
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
                Schedule
            </button>
        );
    }

    if (locations.length === 0) {
        return (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                Add at least one saved location before scheduling this date.
            </div>
        );
    }

    return (
        <form action={handleSubmit} className="mt-4 space-y-3 border border-white/10 rounded-xl p-4 bg-white/5">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Set Up Date</p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <input type="hidden" name="matchId" value={matchId} />
            <div>
                <label className="block text-xs text-gray-400 mb-1">Saved Location</label>
                <select
                    name="locationId"
                    required
                    defaultValue=""
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                    <option value="" disabled className="bg-[#121220] text-gray-400">
                        Choose a location
                    </option>
                    {locations.map((location) => (
                        <option key={location.id} value={location.id} className="bg-[#121220] text-white">
                            {location.name} - {location.address}
                            {location.vibe ? ` (${location.vibe})` : ""}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-400 mb-1">Date & Time</label>
                <input
                    type="datetime-local"
                    name="scheduledAt"
                    required
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
            </div>
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    {isPending ? "Scheduling…" : "Save Date & Notify"}
                </button>
                <button
                    type="button"
                    onClick={() => { setOpen(false); setError(null); }}
                    className="px-4 py-2 bg-white/8 hover:bg-white/12 text-gray-300 text-sm rounded-lg transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
