"use client";

import { useState, useTransition } from "react";

import {
    createDateLocation,
    deleteDateLocation,
    toggleDateLocation,
    updateDateLocation,
} from "@/lib/actions/admin";

export function CreateLocationForm() {
    const [isPending, startTransition] = useTransition();

    return (
        <form
            action={(formData) => startTransition(() => createDateLocation(formData))}
            className="rounded-xl border border-white/10 bg-white/5 p-5"
        >
            <h2 className="text-base font-semibold text-white">Add Location</h2>
            <p className="mt-1 text-sm text-gray-400">Save a reusable venue for manual scheduling.</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                    <label className="mb-1 block text-xs text-gray-400">Location name</label>
                    <input
                        name="name"
                        required
                        placeholder="CJ's Kilimani"
                        className="w-full rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs text-gray-400">Best for vibe</label>
                    <select
                        name="vibe"
                        defaultValue=""
                        className="w-full rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    >
                        <option value="" className="bg-[#121220] text-white">Any</option>
                        <option value="coffee" className="bg-[#121220] text-white">Coffee</option>
                        <option value="walk" className="bg-[#121220] text-white">Walk</option>
                        <option value="dinner" className="bg-[#121220] text-white">Dinner</option>
                        <option value="hangout" className="bg-[#121220] text-white">Hangout</option>
                    </select>
                </div>
            </div>

            <div className="mt-4">
                <label className="mb-1 block text-xs text-gray-400">Address</label>
                <input
                    name="address"
                    required
                    placeholder="Kilimani, Nairobi"
                    className="w-full rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
            </div>

            <div className="mt-4">
                <label className="mb-1 block text-xs text-gray-400">Notes</label>
                <textarea
                    name="notes"
                    rows={3}
                    placeholder="Quiet during weekdays, works well for evening coffee dates."
                    className="w-full rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
            </div>

            <button
                type="submit"
                disabled={isPending}
                className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
                {isPending ? "Saving…" : "Save location"}
            </button>
        </form>
    );
}

export function LocationStatusButton({
    locationId,
    isActive,
}: {
    locationId: string;
    isActive: boolean;
}) {
    const [isPending, startTransition] = useTransition();

    return (
        <button
            onClick={() => startTransition(() => toggleDateLocation(locationId, !isActive))}
            disabled={isPending}
            className={`rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 ${
                isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
        >
            {isPending ? "Saving…" : isActive ? "Archive" : "Activate"}
        </button>
    );
}

type EditableLocation = {
    id: string;
    name: string;
    address: string;
    vibe: string | null;
    notes: string | null;
    isActive: boolean;
};

export function LocationRowActions({ location }: { location: EditableLocation }) {
    const [editing, setEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    if (editing) {
        return (
            <form
                action={(formData) =>
                    startTransition(async () => {
                        try {
                            await updateDateLocation(formData);
                            setEditing(false);
                            setError(null);
                        } catch (err) {
                            setError(err instanceof Error ? err.message : "Failed to update location");
                        }
                    })
                }
                className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4"
            >
                <input type="hidden" name="locationId" value={location.id} />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="grid gap-3 md:grid-cols-2">
                    <input
                        name="name"
                        required
                        defaultValue={location.name}
                        className="w-full rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                    <select
                        name="vibe"
                        defaultValue={location.vibe ?? ""}
                        className="w-full rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    >
                        <option value="" className="bg-[#121220] text-white">Any</option>
                        <option value="coffee" className="bg-[#121220] text-white">Coffee</option>
                        <option value="walk" className="bg-[#121220] text-white">Walk</option>
                        <option value="dinner" className="bg-[#121220] text-white">Dinner</option>
                        <option value="hangout" className="bg-[#121220] text-white">Hangout</option>
                    </select>
                </div>
                <input
                    name="address"
                    required
                    defaultValue={location.address}
                    className="w-full rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <textarea
                    name="notes"
                    rows={3}
                    defaultValue={location.notes ?? ""}
                    className="w-full rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <div className="flex flex-wrap gap-2">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                    >
                        {isPending ? "Saving…" : "Save changes"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setEditing(false);
                            setError(null);
                        }}
                        className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/15"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => setEditing(true)}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
                Edit
            </button>
            <LocationStatusButton locationId={location.id} isActive={location.isActive} />
            <button
                onClick={() =>
                    startTransition(async () => {
                        const confirmed = window.confirm(
                            `Delete "${location.name}" from the database? Existing scheduled dates will keep their copied venue text, but this saved location will be removed.`,
                        );
                        if (!confirmed) return;
                        await deleteDateLocation(location.id);
                    })
                }
                disabled={isPending}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-800 disabled:opacity-50"
            >
                {isPending ? "Deleting…" : "Delete"}
            </button>
        </div>
    );
}
