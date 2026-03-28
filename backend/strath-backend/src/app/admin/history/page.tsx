import { getAdminDateHistory } from "@/lib/actions/admin";
import { StatusUpdateButtons } from "../scheduled-dates/_actions";

const STATUS_BADGE: Record<string, string> = {
    attended: "bg-green-500/20 text-green-300",
    cancelled: "bg-red-500/20 text-red-300",
    no_show: "bg-orange-500/20 text-orange-300",
};

export default async function AdminHistoryPage() {
    const rows = await getAdminDateHistory();

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">History</h1>
                <p className="text-sm text-gray-400 mt-1">
                    {rows.length} completed, cancelled, or no-show date{rows.length !== 1 ? "s" : ""}
                </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {rows.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">No date history yet</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Pair</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Vibe</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">When</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Where</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Outcome</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((dm, index) => (
                                <tr
                                    key={dm.id}
                                    className={`border-b border-white/5 last:border-0 ${index % 2 === 0 ? "" : "bg-white/2"}`}
                                >
                                    <td className="px-4 py-3 font-medium text-white">
                                        {dm.userA.firstName} × {dm.userB.firstName}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 capitalize">{dm.vibe}</td>
                                    <td className="px-4 py-3 text-xs text-gray-300">
                                        {dm.scheduledAt
                                            ? new Date(dm.scheduledAt).toLocaleString("en-KE", {
                                                  dateStyle: "medium",
                                                  timeStyle: "short",
                                              })
                                            : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        <div className="max-w-[220px]">
                                            <p className="text-white">{dm.venueName ?? "—"}</p>
                                            {dm.venueAddress && <p className="truncate text-gray-500">{dm.venueAddress}</p>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${STATUS_BADGE[dm.status] ?? ""}`}>
                                            {dm.status.replace("_", " ")}
                                        </span>
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
