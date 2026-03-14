import { getAdminDateRequests } from "@/lib/actions/admin";

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300",
    accepted: "bg-green-500/20 text-green-300",
    declined: "bg-red-500/20 text-red-300",
    expired: "bg-gray-500/20 text-gray-300",
    cancelled: "bg-orange-500/20 text-orange-300",
};

const VIBE_EMOJIS: Record<string, string> = {
    coffee: "☕",
    walk: "🚶",
    dinner: "🍽️",
    hangout: "🎮",
};

export default async function DateRequestsPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const { status } = await searchParams;
    const rows = await getAdminDateRequests(status);

    const filters = ["all", "pending", "accepted", "declined", "expired", "cancelled"];

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Date Requests</h1>
                <p className="text-sm text-gray-400 mt-1">{rows.length} result{rows.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {filters.map((f) => (
                    <a
                        key={f}
                        href={f === "all" ? "/admin/date-requests" : `/admin/date-requests?status=${f}`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                            (status ?? "all") === f
                                ? "bg-purple-600 text-white"
                                : "bg-white/8 text-gray-400 hover:text-white hover:bg-white/12"
                        }`}
                    >
                        {f}
                    </a>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {rows.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No requests found</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">From</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">To</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Vibe</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Message</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Sent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr
                                    key={r.id}
                                    className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/2"}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">{r.fromUser.firstName}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[120px]">{r.fromUser.email}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">{r.toUser.firstName}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[120px]">{r.toUser.email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">
                                        <span className="capitalize">{VIBE_EMOJIS[r.vibe] ?? ""} {r.vibe}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 max-w-[200px]">
                                        <span className="truncate block">{r.message ?? "—"}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${STATUS_COLORS[r.status] ?? ""}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {new Date(r.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
