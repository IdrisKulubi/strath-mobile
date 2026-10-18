import { getAdminPushNotificationInsights } from "@/lib/actions/admin-push-notifications";
import { Bell } from "lucide-react";
import { PushNotificationsChart } from "./_chart";

function Stat({
    label,
    value,
    sub,
    accent,
}: {
    label: string;
    value: number | string;
    sub?: string;
    accent?: string;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${accent ?? "text-white"}`}>{value}</p>
            {sub ? <p className="mt-1 text-[11px] text-gray-500">{sub}</p> : null}
        </div>
    );
}

function FunnelStep({
    label,
    value,
    total,
    color,
    rate,
}: {
    label: string;
    value: number;
    total: number;
    color: string;
    rate?: string;
}) {
    const pct = total > 0 ? Math.max(2, Math.round((value / total) * 100)) : 2;
    return (
        <div>
            <div className="mb-2 flex items-end justify-between">
                <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    {rate ? <p className="text-xs text-gray-500">{rate}</p> : null}
                </div>
                <span className="text-xl font-bold text-white">{value.toLocaleString()}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/8">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-KE", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default async function PushNotificationsAdminPage() {
    const { snapshot, timeSeries, recentUsers } = await getAdminPushNotificationInsights(30);

    const withoutPush = recentUsers.filter((row) => !row.hasPush);
    const withPush = recentUsers.filter((row) => row.hasPush);

    return (
        <div className="p-8">
            <div className="mb-6 flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-300">
                    <Bell className="size-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Push notifications</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-400">
                        Adoption and funnel for the pre-permission sheet approach: who tapped Enable,
                        who registered a token, and coverage across mutual matches and slot confirmation.
                    </p>
                </div>
            </div>

            <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                    label="Push enabled"
                    value={snapshot.pushEnabled}
                    sub={`${snapshot.pushAdoptionPct}% of ${snapshot.totalActiveUsers} active users`}
                    accent="text-pink-300"
                />
                <Stat
                    label="Eligible with push"
                    value={snapshot.eligibleWithPush}
                    sub={`${snapshot.eligibleAdoptionPct}% of ${snapshot.eligibleProfiles} completed profiles`}
                />
                <Stat
                    label="Prompt accepted (30d)"
                    value={snapshot.prePromptAccepted}
                    sub={`${snapshot.prePromptDismissed} dismissed`}
                />
                <Stat
                    label="Tokens registered (7d)"
                    value={snapshot.tokenRegistrationsLast7d}
                    sub={`${snapshot.promptToRegisterPct}% of prompt accepts (30d)`}
                />
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                        Adoption funnel
                    </h2>
                    <div className="space-y-5">
                        <FunnelStep
                            label="Active users"
                            value={snapshot.totalActiveUsers}
                            total={snapshot.totalActiveUsers}
                            color="bg-purple-500"
                        />
                        <FunnelStep
                            label="Push token registered"
                            value={snapshot.pushEnabled}
                            total={snapshot.totalActiveUsers}
                            color="bg-pink-500"
                            rate={`${snapshot.pushAdoptionPct}% adoption`}
                        />
                        <FunnelStep
                            label="In mutual match (with push)"
                            value={snapshot.mutualMatchWithPush}
                            total={snapshot.mutualMatchUsers}
                            color="bg-blue-500"
                            rate={
                                snapshot.mutualMatchUsers > 0
                                    ? `${Math.round((snapshot.mutualMatchWithPush / snapshot.mutualMatchUsers) * 100)}% of mutual-match users`
                                    : "No mutual matches yet"
                            }
                        />
                        <FunnelStep
                            label="Slot confirmation flow (with push)"
                            value={snapshot.slotFlowWithPush}
                            total={snapshot.slotFlowUsers}
                            color="bg-emerald-500"
                            rate={
                                snapshot.slotFlowUsers > 0
                                    ? `${Math.round((snapshot.slotFlowWithPush / snapshot.slotFlowUsers) * 100)}% reachable for meetup alerts`
                                    : "No slot assignments yet"
                            }
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
                        Daily activity (30 days)
                    </h2>
                    <p className="mb-4 text-xs text-gray-500">
                        Token registrations and pre-prompt outcomes are logged from the app going forward.
                        Users who enabled push before tracking still appear in the snapshot counts above.
                    </p>
                    <PushNotificationsChart data={timeSeries} />
                </div>
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    <div className="border-b border-white/10 px-4 py-3">
                        <h2 className="text-sm font-semibold text-white">
                            Recently active · push on ({withPush.length})
                        </h2>
                    </div>
                    {withPush.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">None in recent sample</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                                    <th className="px-4 py-2">User</th>
                                    <th className="px-4 py-2">Cohort</th>
                                    <th className="px-4 py-2">Last active</th>
                                </tr>
                            </thead>
                            <tbody>
                                {withPush.slice(0, 25).map((row) => (
                                    <tr key={row.id} className="border-b border-white/5">
                                        <td className="px-4 py-2">
                                            <div className="font-medium text-white">{row.name}</div>
                                            <div className="text-xs text-gray-500">{row.email}</div>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-400">
                                            {row.inSlotFlow
                                                ? "Slot flow"
                                                : row.inMutualMatch
                                                  ? "Mutual match"
                                                  : row.profileCompleted
                                                    ? "Profile complete"
                                                    : "—"}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-500">
                                            {formatDate(row.lastActive)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <div className="border-b border-amber-500/20 px-4 py-3">
                        <h2 className="text-sm font-semibold text-amber-100">
                            Recently active · no push ({withoutPush.length})
                        </h2>
                        <p className="text-xs text-amber-200/70">Users who may miss meetup and match alerts</p>
                    </div>
                    {withoutPush.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">Everyone in sample has push on</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                                    <th className="px-4 py-2">User</th>
                                    <th className="px-4 py-2">Cohort</th>
                                    <th className="px-4 py-2">Last active</th>
                                </tr>
                            </thead>
                            <tbody>
                                {withoutPush.slice(0, 25).map((row) => (
                                    <tr key={row.id} className="border-b border-white/5">
                                        <td className="px-4 py-2">
                                            <div className="font-medium text-white">{row.name}</div>
                                            <div className="text-xs text-gray-500">{row.email}</div>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-amber-200/80">
                                            {row.inSlotFlow
                                                ? "Slot flow · at risk"
                                                : row.inMutualMatch
                                                  ? "Mutual match · at risk"
                                                  : row.profileCompleted
                                                    ? "Profile complete"
                                                    : "—"}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-500">
                                            {formatDate(row.lastActive)}
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
