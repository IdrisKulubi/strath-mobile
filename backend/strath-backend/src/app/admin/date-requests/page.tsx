import { archiveAdminMatchActivity, getAdminDateRequests, moveMutualMatchToArranging } from "@/lib/actions/admin";

const STATUS_COLORS: Record<string, string> = {
    open_to_meet: "bg-emerald-500/20 text-emerald-300",
    maybe: "bg-amber-500/20 text-amber-300",
    passed: "bg-red-500/20 text-red-300",
    mutual: "bg-pink-500/20 text-pink-200",
    mutual_match: "bg-pink-500/20 text-pink-200",
    legacy_request: "bg-blue-500/20 text-blue-200",
    pending: "bg-yellow-500/20 text-yellow-300",
    accepted: "bg-green-500/20 text-green-300",
    declined: "bg-red-500/20 text-red-300",
    expired: "bg-gray-500/20 text-gray-300",
    cancelled: "bg-orange-500/20 text-orange-300",
};

const FILTERS = [
    { value: "all", label: "All" },
    { value: "open_to_meet", label: "Interested" },
    { value: "maybe", label: "Maybe later" },
    { value: "passed", label: "Passed" },
    { value: "mutual_match", label: "Mutual matches" },
    { value: "legacy_request", label: "Legacy invites" },
    { value: "pending", label: "Pending old invites" },
];

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-KE", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function UserCell({
    user,
}: {
    user: Awaited<ReturnType<typeof getAdminDateRequests>>["rows"][number]["fromUser"];
}) {
    return (
        <div className="flex items-center gap-3">
            {user.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePhoto} alt="" className="size-9 rounded-full object-cover" />
            ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-xs font-bold text-white">
                    {user.firstName.charAt(0).toUpperCase()}
                </div>
            )}
            <div>
                <div className="font-medium text-white">{user.name || user.firstName}</div>
                {user.email && <div className="max-w-[190px] truncate text-xs text-gray-500">{user.email}</div>}
                {user.phone && <div className="text-xs text-gray-500">{user.phone}</div>}
                {(user.university || user.course) && (
                    <div className="max-w-[210px] truncate text-[11px] text-gray-600">
                        {[user.course, user.university].filter(Boolean).join(" · ")}
                    </div>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
    );
}

export default async function DateRequestsPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const { status } = await searchParams;
    const { rows, stats } = await getAdminDateRequests(status);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Match Activity</h1>
                <p className="mt-1 max-w-3xl text-sm text-gray-400">
                    Current matching decisions come from candidate pairs. Legacy direct date invites are still shown here when they exist.
                </p>
            </div>

            <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
                <Stat label="All activity" value={stats.all} />
                <Stat label="Interested" value={stats.openToMeet} />
                <Stat label="Maybe" value={stats.maybe} />
                <Stat label="Passed" value={stats.passed} />
                <Stat label="Mutual matches" value={stats.mutual} />
                <Stat label="Legacy invites" value={stats.legacy} />
                <Stat label="Pending pairs" value={stats.pendingPairs} />
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                    <a
                        key={filter.value}
                        href={filter.value === "all" ? "/admin/date-requests" : `/admin/date-requests?status=${filter.value}`}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            (status ?? "all") === filter.value
                                ? "bg-purple-600 text-white"
                                : "bg-white/8 text-gray-400 hover:bg-white/12 hover:text-white"
                        }`}
                    >
                        {filter.label}
                    </a>
                ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {rows.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No match activity found</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Actor</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Target</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Activity</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Pair</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Details</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">When</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr
                                    key={row.id}
                                    className={`border-b border-white/5 last:border-0 ${index % 2 === 0 ? "" : "bg-white/2"}`}
                                >
                                    <td className="px-4 py-3">
                                        <UserCell user={row.fromUser} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <UserCell user={row.toUser} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${STATUS_COLORS[row.kind] ?? "bg-white/8 text-gray-300"}`}>
                                            {row.label}
                                        </span>
                                        <div className="mt-1 text-[11px] text-gray-500">{row.source.replace(/_/g, " ")}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        {row.pairStatus ? (
                                            <>
                                                <div className="capitalize">{row.pairStatus.replace(/_/g, " ")}</div>
                                                {row.compatibilityScore !== null && (
                                                    <div className="text-gray-500">{row.compatibilityScore}% compatibility</div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-gray-500">Direct invite</span>
                                        )}
                                    </td>
                                    <td className="max-w-[260px] px-4 py-3 text-xs text-gray-400">
                                        {row.message ? (
                                            <span className="block truncate">{row.message}</span>
                                        ) : row.matchReasons.length > 0 ? (
                                            <span className="block truncate">{row.matchReasons.join(" · ")}</span>
                                        ) : (
                                            <span className="text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(row.updatedAt)}</td>
                                    <td className="px-4 py-3 text-right">
                                        {row.pairId || row.mutualMatchId ? (
                                            <div className="flex flex-col items-end gap-2">
                                                {row.mutualMatchId && row.status === "mutual" && (
                                                    <form
                                                        action={async () => {
                                                            "use server";
                                                            await moveMutualMatchToArranging(row.mutualMatchId);
                                                        }}
                                                    >
                                                        <button
                                                            type="submit"
                                                            className="rounded-md border border-amber-400/35 px-2 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/10"
                                                        >
                                                            Move to Arranging
                                                        </button>
                                                    </form>
                                                )}
                                                {row.pairId ? (
                                                    <form
                                                        action={async () => {
                                                            "use server";
                                                            await archiveAdminMatchActivity(row.pairId);
                                                        }}
                                                    >
                                                        <button
                                                            type="submit"
                                                            className="rounded-md border border-red-500/30 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                                                        >
                                                            Delete
                                                        </button>
                                                    </form>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-600">-</span>
                                        )}
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
