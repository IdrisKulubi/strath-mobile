import { getAdminScheduledDates } from "@/lib/actions/admin";
import { StatusUpdateButtons } from "./_actions";

const STATUS_BADGE: Record<string, string> = {
    scheduled: "bg-blue-500/20 text-blue-300",
    attended: "bg-green-500/20 text-green-300",
    cancelled: "bg-red-500/20 text-red-300",
    no_show: "bg-orange-500/20 text-orange-300",
};

function StarRating({ rating }: { rating: number | null }) {
    if (!rating) return <span className="text-gray-500 text-xs">—</span>;
    return (
        <span className="text-yellow-400 text-sm">
            {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
            <span className="text-xs text-gray-400 ml-1">{rating}</span>
        </span>
    );
}

export default async function ScheduledDatesPage() {
    const rows = await getAdminScheduledDates();

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Scheduled Dates</h1>
                <p className="text-sm text-gray-400 mt-1">{rows.length} dates</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {rows.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">No scheduled dates yet</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Pair</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Vibe</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Feedback</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Matched</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((dm, i) => (
                                <tr
                                    key={dm.id}
                                    className={`border-b border-white/5 last:border-0 align-top ${i % 2 === 0 ? "" : "bg-white/2"}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">
                                            {dm.userA.firstName} × {dm.userB.firstName}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 capitalize">{dm.vibe}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${STATUS_BADGE[dm.status] ?? ""}`}>
                                            {dm.status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-0.5">
                                            <StarRating rating={dm.avgRating} />
                                            {dm.feedbackCount > 0 && (
                                                <p className="text-xs text-gray-500">{dm.feedbackCount}/2 submitted</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {new Date(dm.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusUpdateButtons matchId={dm.id} current={dm.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
