import { getAdminUsers } from "@/lib/actions/admin";
import { UserActions } from "./_actions";

export default async function AdminUsersPage() {
    const users = await getAdminUsers();

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Users</h1>
                <p className="text-sm text-gray-400 mt-1">{users.length} total</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">User</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Role</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Profile</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Activity</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Last Active</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u, i) => (
                            <tr
                                key={u.id}
                                className={`border-b border-white/5 last:border-0 align-middle ${u.deletedAt ? "opacity-50" : ""} ${i % 2 === 0 ? "" : "bg-white/2"}`}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                            {(u.firstName ?? u.name)?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-white leading-tight">
                                                {u.firstName ?? u.name}
                                                {u.deletedAt && <span className="ml-2 text-xs text-red-400">(suspended)</span>}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate max-w-[160px]">{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === "admin" ? "bg-purple-500/30 text-purple-300" : "bg-white/8 text-gray-400"}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {u.profileComplete
                                        ? <span className="text-green-400 text-xs font-medium">✓ Complete</span>
                                        : <span className="text-gray-500 text-xs">Incomplete</span>
                                    }
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-400 space-y-0.5">
                                    <div>{u.sentRequests} sent · {u.receivedRequests} received</div>
                                    <div className="text-gray-500">{u.dateMatches} date matches</div>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                    {new Date(u.lastActive).toLocaleDateString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td className="px-4 py-3">
                                    <UserActions
                                        userId={u.id}
                                        isSuspended={!!u.deletedAt}
                                        role={u.role ?? "user"}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
