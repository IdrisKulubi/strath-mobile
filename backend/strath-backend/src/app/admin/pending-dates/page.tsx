import { getAdminPendingDates } from "@/lib/actions/admin";
import { ScheduleDateForm } from "./_actions";

const VIBE_EMOJIS: Record<string, string> = {
    coffee: "☕",
    walk: "🚶",
    dinner: "🍽️",
    hangout: "🎮",
};

export default async function PendingDatesPage() {
    const rows = await getAdminPendingDates();

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Pending Setup</h1>
                <p className="text-sm text-gray-400 mt-1">
                    {rows.length} date{rows.length !== 1 ? "s" : ""} waiting to be scheduled
                </p>
            </div>

            {rows.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-16 text-center text-gray-500">
                    All clear — no pending dates to schedule
                </div>
            ) : (
                <div className="space-y-4">
                    {rows.map((dm) => (
                        <div key={dm.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-center gap-4">
                                    {/* User A */}
                                    <div className="text-center">
                                        <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center text-sm font-bold text-purple-300 mb-1">
                                            {dm.userA.firstName.charAt(0)}
                                        </div>
                                        <p className="text-xs font-medium text-white">{dm.userA.firstName}</p>
                                    </div>
                                    <div className="text-lg">{VIBE_EMOJIS[dm.vibe] ?? "📅"}</div>
                                    {/* User B */}
                                    <div className="text-center">
                                        <div className="w-10 h-10 rounded-full bg-pink-600/30 flex items-center justify-center text-sm font-bold text-pink-300 mb-1">
                                            {dm.userB.firstName.charAt(0)}
                                        </div>
                                        <p className="text-xs font-medium text-white">{dm.userB.firstName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 capitalize">{dm.vibe}</span>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        {new Date(dm.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                                    </p>
                                </div>
                            </div>

                            {/* Contact info */}
                            <div className="grid grid-cols-2 gap-3 mb-4 text-xs text-gray-400">
                                <div className="bg-white/5 rounded-lg p-3">
                                    <p className="font-medium text-gray-300 mb-1">{dm.userA.firstName}</p>
                                    {dm.userA.phone && <p>📞 {dm.userA.phone}</p>}
                                    {dm.userA.email && <p className="truncate">✉ {dm.userA.email}</p>}
                                </div>
                                <div className="bg-white/5 rounded-lg p-3">
                                    <p className="font-medium text-gray-300 mb-1">{dm.userB.firstName}</p>
                                    {dm.userB.phone && <p>📞 {dm.userB.phone}</p>}
                                    {dm.userB.email && <p className="truncate">✉ {dm.userB.email}</p>}
                                </div>
                            </div>

                            {/* Schedule form */}
                            <ScheduleDateForm matchId={dm.id} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
