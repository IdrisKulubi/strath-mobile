"use client";

import { useState, useTransition } from "react";
import { scheduleDate } from "@/lib/actions/admin";

export function ScheduleDateForm({ matchId }: { matchId: string }) {
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

    return (
        <form action={handleSubmit} className="mt-4 space-y-3 border border-white/10 rounded-xl p-4 bg-white/5">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Schedule Date</p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <input type="hidden" name="matchId" value={matchId} />
            <div>
                <label className="block text-xs text-gray-400 mb-1">Venue Name</label>
                <input
                    name="venueName"
                    required
                    placeholder="e.g. Java House Westlands"
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
            </div>
            <div>
                <label className="block text-xs text-gray-400 mb-1">Venue Address</label>
                <input
                    name="venueAddress"
                    placeholder="e.g. Westlands, Nairobi"
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
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
                    {isPending ? "Scheduling…" : "Confirm & Notify"}
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
