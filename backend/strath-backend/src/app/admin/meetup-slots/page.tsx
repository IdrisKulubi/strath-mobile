import {
    getAdminMeetupSlotTracking,
    type MeetupSlotTrackingFilter,
} from "@/lib/actions/admin-meetup-slots";
import { CalendarClock } from "lucide-react";

const FILTERS: { value: MeetupSlotTrackingFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "awaiting_both", label: "Awaiting both" },
    { value: "one_confirmed", label: "One confirmed" },
    { value: "both_confirmed", label: "Both confirmed" },
    { value: "window_closed", label: "Window closed" },
    { value: "scheduled", label: "Scheduled" },
    { value: "expired", label: "Expired" },
];

const PHASE_COLORS: Record<string, string> = {
    awaiting_both: "bg-amber-500/20 text-amber-200",
    one_confirmed: "bg-blue-500/20 text-blue-200",
    both_confirmed: "bg-emerald-500/20 text-emerald-300",
    window_closed: "bg-orange-500/20 text-orange-200",
    scheduled: "bg-pink-500/20 text-pink-200",
    expired: "bg-gray-500/20 text-gray-300",
    other: "bg-white/10 text-gray-300",
};

function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-KE", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatPhaseLabel(phase: string) {
    return phase.replace(/_/g, " ");
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
            {sub ? <p className="mt-1 text-[11px] text-gray-500">{sub}</p> : null}
        </div>
    );
}

function UserCell({
    user,
}: {
    user: {
        firstName: string;
        name: string;
        email: string | null;
        profilePhoto: string | null;
        university: string | null;
        course: string | null;
    };
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
                {user.email ? <div className="max-w-[190px] truncate text-xs text-gray-500">{user.email}</div> : null}
                {(user.university || user.course) && (
                    <div className="max-w-[210px] truncate text-[11px] text-gray-600">
                        {[user.course, user.university].filter(Boolean).join(" · ")}
                    </div>
                )}
            </div>
        </div>
    );
}

export default async function MeetupSlotsAdminPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const { status } = await searchParams;
    const filter = (FILTERS.some((f) => f.value === status) ? status : "all") as MeetupSlotTrackingFilter;
    const { matches, participants, stats } = await getAdminMeetupSlotTracking(filter);

    const pendingParticipants = participants.filter((p) => p.interaction === "pending_confirm");
    const confirmedParticipants = participants.filter((p) => p.interaction === "confirmed");

    return (
        <div className="p-8">
            <div className="mb-6 flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-300">
                    <CalendarClock className="size-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Meetup slot confirmation</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-400">
                        Track mutual matches on the self-allocating Wed/Sat campus time flow: who confirmed,
                        who is still pending, and which dates auto-scheduled after both confirm.
                    </p>
                </div>
            </div>

            <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Stat label="Matches with slots" value={stats.totalMatches} />
                <Stat label="Awaiting both" value={stats.awaitingBoth} />
                <Stat label="One confirmed" value={stats.oneConfirmed} />
                <Stat
                    label="People confirmed"
                    value={stats.usersConfirmed}
                    sub={`${stats.usersPendingConfirm} still pending`}
                />
                <Stat label="Scheduled / expired" value={stats.scheduledOrUpcoming + stats.expired} />
            </div>

            <div className="mb-8 flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                    <a
                        key={item.value}
                        href={
                            item.value === "all"
                                ? "/admin/meetup-slots"
                                : `/admin/meetup-slots?status=${item.value}`
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            filter === item.value
                                ? "bg-purple-600 text-white"
                                : "bg-white/8 text-gray-400 hover:bg-white/12 hover:text-white"
                        }`}
                    >
                        {item.label}
                    </a>
                ))}
            </div>

            <div className="mb-10">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    People ({participants.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {participants.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">No participants for this filter</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Person</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">With</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Interaction</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Assigned time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Confirm by</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Phase</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participants.map((row, index) => (
                                    <tr
                                        key={`${row.mutualMatchId}-${row.userId}`}
                                        className={`border-b border-white/5 last:border-0 ${index % 2 === 0 ? "" : "bg-white/2"}`}
                                    >
                                        <td className="px-4 py-3">
                                            <UserCell user={row.user} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <UserCell user={row.partner} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-md px-2 py-1 text-xs font-medium ${
                                                    row.interaction === "confirmed"
                                                        ? "bg-emerald-500/20 text-emerald-300"
                                                        : "bg-amber-500/20 text-amber-200"
                                                }`}
                                            >
                                                {row.interaction === "confirmed" ? "Confirmed slot" : "Pending confirm"}
                                            </span>
                                            <div className="mt-1 text-[11px] text-gray-500">
                                                {row.confirmedAt
                                                    ? formatDate(row.confirmedAt)
                                                    : "Not yet"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-300">
                                            {row.scheduledAtLabel ?? "—"}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {formatDate(row.confirmBy)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${PHASE_COLORS[row.phase] ?? PHASE_COLORS.other}`}
                                            >
                                                {formatPhaseLabel(row.phase)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                    {pendingParticipants.length} pending · {confirmedParticipants.length} confirmed in this view
                </p>
            </div>

            <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Matches ({matches.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {matches.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">No matches for this filter</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">User A</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">User B</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Slot</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">A confirmed</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">B confirmed</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Phase</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Date status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matches.map((row, index) => (
                                    <tr
                                        key={row.mutualMatchId}
                                        className={`border-b border-white/5 last:border-0 ${index % 2 === 0 ? "" : "bg-white/2"}`}
                                    >
                                        <td className="px-4 py-3">
                                            <UserCell user={row.userA} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <UserCell user={row.userB} />
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-300">
                                            <div className="font-medium capitalize text-white">
                                                {row.assignedSlot ?? "—"}
                                            </div>
                                            <div>{row.scheduledAtLabel ?? "—"}</div>
                                            <div className="mt-1 text-gray-500">
                                                Confirm by {formatDate(row.confirmBy)}
                                            </div>
                                            {row.confirmWindowOpen ? (
                                                <div className="mt-1 text-emerald-400">Window open</div>
                                            ) : (
                                                <div className="mt-1 text-gray-500">Window closed</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {formatDate(row.userAConfirmedAt)}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {formatDate(row.userBConfirmedAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${PHASE_COLORS[row.phase] ?? PHASE_COLORS.other}`}
                                            >
                                                {formatPhaseLabel(row.phase)}
                                            </span>
                                            <div className="mt-1 text-[11px] capitalize text-gray-500">
                                                {row.status.replace(/_/g, " ")}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs capitalize text-gray-400">
                                            {row.dateMatchStatus?.replace(/_/g, " ") ?? "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
