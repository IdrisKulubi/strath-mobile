import { getAdminOnCallSessions } from "@/lib/actions/admin";

const STATUS_BADGE: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300",
    scheduled: "bg-blue-500/20 text-blue-300",
    active: "bg-emerald-500/20 text-emerald-300",
};

export default async function AdminOnCallPage() {
    const rows = await getAdminOnCallSessions();

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">On Call</h1>
                <p className="mt-1 text-sm text-gray-400">
                    {rows.length} vibe check{rows.length !== 1 ? "s" : ""} currently waiting, joining, or active
                </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {rows.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">No live call sessions right now</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Pair</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Invite / Start</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Contact</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Locations</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Date Flow</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((session, index) => (
                                <tr
                                    key={session.id}
                                    className={`border-b border-white/5 align-top last:border-0 ${index % 2 === 0 ? "" : "bg-white/2"}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">
                                            {session.userA.firstName} × {session.userB.firstName}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">Room: {session.roomName}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-md px-2 py-1 text-xs font-medium uppercase tracking-wide ${STATUS_BADGE[session.status ?? ""] ?? "bg-white/10 text-gray-300"}`}>
                                            {session.status ?? "unknown"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-300">
                                        <div>{session.scheduledAt ? `Invited: ${new Date(session.scheduledAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}` : "-"}</div>
                                        <div className="mt-1 text-gray-500">
                                            {session.startedAt ? `Started: ${new Date(session.startedAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}` : "Not started yet"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        <div className="space-y-2">
                                            <div>
                                                <p className="font-medium text-gray-300">{session.userA.firstName}</p>
                                                {session.userA.phone && <p>{session.userA.phone}</p>}
                                                {session.userA.email && <p className="truncate">{session.userA.email}</p>}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-300">{session.userB.firstName}</p>
                                                {session.userB.phone && <p>{session.userB.phone}</p>}
                                                {session.userB.email && <p className="truncate">{session.userB.email}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        <div className="space-y-2">
                                            <div>
                                                <p className="font-medium text-gray-300">{session.userA.firstName}</p>
                                                <p className="max-w-[200px] truncate text-gray-500">{session.userA.location ?? "-"}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-300">{session.userB.firstName}</p>
                                                <p className="max-w-[200px] truncate text-gray-500">{session.userB.location ?? "-"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        <div className="space-y-1">
                                            <p>Date match: {session.dateMatchStatus ?? "-"}</p>
                                            <p>Call completed: {session.callCompleted ? "Yes" : "No"}</p>
                                            <p>
                                                Decisions: {session.user1Decision ?? "-"} / {session.user2Decision ?? "-"}
                                            </p>
                                        </div>
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
