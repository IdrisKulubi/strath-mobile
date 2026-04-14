import { getAdminDateLocations, getAdminPendingDates } from "@/lib/actions/admin";
import { ScheduleDateForm } from "./_actions";

const VIBE_EMOJIS: Record<string, string> = {
    coffee: "☕",
    walk: "🚶",
    dinner: "🍽",
    hangout: "🎮",
};

export default async function PendingDatesPage() {
    const [rows, locations] = await Promise.all([
        getAdminPendingDates(),
        getAdminDateLocations(),
    ]);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Arranging</h1>
                <p className="mt-1 text-sm text-gray-400">
                    {rows.length} pair{rows.length !== 1 ? "s" : ""} agreed to meet and need a manual setup
                </p>
            </div>

            {rows.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-16 text-center text-gray-500">
                    All clear - no agreed pairs waiting for setup
                </div>
            ) : (
                <div className="space-y-4">
                    {rows.map((dm) => (
                        <div key={dm.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/30 text-sm font-bold text-purple-300">
                                            {dm.userA.firstName.charAt(0)}
                                        </div>
                                        <p className="text-xs font-medium text-white">{dm.userA.firstName}</p>
                                    </div>
                                    <div className="text-lg">{VIBE_EMOJIS[dm.vibe] ?? "📅"}</div>
                                    <div className="text-center">
                                        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-pink-600/30 text-sm font-bold text-pink-300">
                                            {dm.userB.firstName.charAt(0)}
                                        </div>
                                        <p className="text-xs font-medium text-white">{dm.userB.firstName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs capitalize text-gray-500">{dm.vibe}</span>
                                    <p className="mt-0.5 text-xs text-gray-600">
                                        {new Date(dm.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                                Both people finished the call and agreed to meet. Pick a saved location and time to move them to Upcoming.
                            </div>

                            <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-gray-400">
                                <div className="rounded-lg bg-white/5 p-3">
                                    <p className="mb-1 font-medium text-gray-300">{dm.userA.firstName}</p>
                                    <p>
                                        Phone:{" "}
                                        {dm.userA.phone?.trim() ? (
                                            dm.userA.phone
                                        ) : (
                                            <span className="text-amber-400/90">Not on file</span>
                                        )}
                                    </p>
                                    <p className="truncate">
                                        Email:{" "}
                                        {dm.userA.email?.trim() ? (
                                            dm.userA.email
                                        ) : (
                                            <span className="text-amber-400/90">Not on file</span>
                                        )}
                                    </p>
                                    <p className="mt-1 text-[11px] text-gray-500">
                                        Location: {dm.userA.location ?? "—"}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-white/5 p-3">
                                    <p className="mb-1 font-medium text-gray-300">{dm.userB.firstName}</p>
                                    <p>
                                        Phone:{" "}
                                        {dm.userB.phone?.trim() ? (
                                            dm.userB.phone
                                        ) : (
                                            <span className="text-amber-400/90">Not on file</span>
                                        )}
                                    </p>
                                    <p className="truncate">
                                        Email:{" "}
                                        {dm.userB.email?.trim() ? (
                                            dm.userB.email
                                        ) : (
                                            <span className="text-amber-400/90">Not on file</span>
                                        )}
                                    </p>
                                    <p className="mt-1 text-[11px] text-gray-500">
                                        Location: {dm.userB.location ?? "—"}
                                    </p>
                                </div>
                            </div>

                            <ScheduleDateForm matchId={dm.id} locations={locations} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
