import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/admin-auth";
import { getFaceVerificationAdminOverview } from "@/lib/services/face-verification-admin";

import {
    processVerificationSessionAction,
    reviewVerificationSessionAction,
    updateVerificationAssistanceStatusAction,
} from "./_actions";

function MetricCard({
    label,
    value,
    hint,
}: {
    label: string;
    value: number | string;
    hint?: string;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const tones: Record<string, string> = {
        processing: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        manual_review: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
        retry_required: "bg-orange-500/15 text-orange-300 border-orange-500/30",
        failed: "bg-red-500/15 text-red-300 border-red-500/30",
        verified: "bg-green-500/15 text-green-300 border-green-500/30",
        blocked: "bg-red-600/15 text-red-200 border-red-600/30",
        pending_capture: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    };

    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${tones[status] ?? "bg-white/10 text-gray-300 border-white/10"}`}>
            {status.replace(/_/g, " ")}
        </span>
    );
}

function AlertBadge({ severity }: { severity: "info" | "warning" | "critical" }) {
    const tones = {
        info: "bg-sky-500/15 text-sky-200 border-sky-500/30",
        warning: "bg-amber-500/15 text-amber-200 border-amber-500/30",
        critical: "bg-red-500/15 text-red-200 border-red-500/30",
    };

    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[severity]}`}>
            {severity}
        </span>
    );
}

function DetailField({
    label,
    value,
}: {
    label: string;
    value: ReactNode;
}) {
    return (
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            <div className="mt-1 text-sm text-gray-200">{value || <span className="text-gray-500">-</span>}</div>
        </div>
    );
}

function ChipList({ items }: { items?: string[] | null }) {
    if (!items || items.length === 0) {
        return <span className="text-gray-500">-</span>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
                <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300"
                >
                    {item}
                </span>
            ))}
        </div>
    );
}

function formatDate(value: Date | string | null | undefined) {
    if (!value) return "-";
    return new Date(value).toLocaleString();
}

export default async function AdminVerificationPage() {
    await requireAdmin();
    const overview = await getFaceVerificationAdminOverview(20);

    return (
        <div className="space-y-8 p-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Face Verification</h1>
                <p className="mt-1 text-sm text-gray-400">
                    Review stuck sessions, manual-review cases, and processor health.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
                <MetricCard
                    label="Queue Depth"
                    value={overview.totals.queueDepth}
                    hint={`Worker batch ${overview.configuration.workerBatchSize}`}
                />
                <MetricCard
                    label="Pending Jobs"
                    value={overview.totals.pendingJobs}
                    hint={`${overview.totals.processingJobs} jobs in flight`}
                />
                <MetricCard
                    label="Attention Required"
                    value={overview.totals.attentionRequired}
                    hint="Retry, manual review, failed"
                />
                <MetricCard
                    label="Completed 24h"
                    value={overview.performance.completedLast24Hours}
                    hint={overview.performance.avgDurationSeconds
                        ? `Avg ${overview.performance.avgDurationSeconds}s`
                        : "No completed runs yet"}
                />
                <MetricCard
                    label="Queue Wait"
                    value={overview.performance.avgQueueWaitSeconds ?? "-"}
                    hint={overview.performance.oldestPendingJobCreatedAt
                        ? `Oldest queued ${new Date(overview.performance.oldestPendingJobCreatedAt).toLocaleString()}`
                        : "Queue is clear"}
                />
                <MetricCard
                    label="Photo Audits"
                    value={overview.totals.pendingPhotoAudits}
                    hint={`${overview.assets.verificationReadyAssets} ready, ${overview.assets.assetsNeedingRefresh} need refresh`}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr,1fr]">
                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                            Ops Alerts
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            Queue, worker, and photo-readiness signals to watch in production.
                        </p>
                    </div>

                    {overview.alerts.length === 0 ? (
                        <p className="text-sm text-gray-400">No active alerts right now.</p>
                    ) : (
                        <div className="space-y-3">
                            {overview.alerts.map((alert) => (
                                <div
                                    key={alert.code}
                                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                                >
                                    <div className="mb-2 flex items-center gap-2">
                                        <AlertBadge severity={alert.severity} />
                                        <p className="text-sm font-semibold text-white">
                                            {alert.code.replace(/_/g, " ")}
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-300">{alert.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                            Worker Snapshot
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            Current queue settings and worker throughput.
                        </p>
                    </div>

                    <div className="space-y-3 text-sm text-gray-300">
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                            <span>Processing mode</span>
                            <span className="font-semibold text-white">{overview.configuration.processingMode}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                            <span>Worker concurrency</span>
                            <span className="font-semibold text-white">{overview.configuration.workerConcurrency}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                            <span>Compare concurrency</span>
                            <span className="font-semibold text-white">{overview.configuration.comparisonConcurrency}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                            <span>Jobs completed 24h</span>
                            <span className="font-semibold text-white">{overview.performance.completedJobsLast24Hours}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                            <span>Avg job runtime</span>
                            <span className="font-semibold text-white">
                                {overview.performance.avgJobRuntimeSeconds ?? "-"}s
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                            <span>Failed jobs</span>
                            <span className="font-semibold text-white">{overview.totals.failedJobs}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Assistance requests
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        Users who asked for help after their first verification attempt failed.
                    </p>
                </div>

                {overview.assistanceRequests.length === 0 ? (
                    <p className="text-sm text-gray-400">No assistance requests yet.</p>
                ) : (
                    <div className="space-y-4">
                        {overview.assistanceRequests.map((request) => (
                            <div
                                key={request.id}
                                className="rounded-xl border border-white/10 bg-black/20 p-4"
                            >
                                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusBadge status={request.status} />
                                            <span className="text-xs text-gray-500">
                                                Attempt {request.attemptNumber}
                                            </span>
                                        </div>
                                        <p className="font-semibold text-white">{request.displayName}</p>
                                        <p className="text-sm text-gray-400">{request.email}</p>
                                        <p className="text-xs text-gray-500">
                                            {request.phoneNumber || "No phone number on file"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Session: {request.sessionId} · {formatDate(request.createdAt)}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {request.status === "new" ? (
                                            <form action={updateVerificationAssistanceStatusAction}>
                                                <input type="hidden" name="assistanceId" value={request.id} />
                                                <input type="hidden" name="status" value="contacted" />
                                                <button
                                                    type="submit"
                                                    className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                                                >
                                                    Mark contacted
                                                </button>
                                            </form>
                                        ) : null}
                                        {request.status !== "resolved" ? (
                                            <form action={updateVerificationAssistanceStatusAction}>
                                                <input type="hidden" name="assistanceId" value={request.id} />
                                                <input type="hidden" name="status" value="resolved" />
                                                <button
                                                    type="submit"
                                                    className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-200"
                                                >
                                                    Mark resolved
                                                </button>
                                            </form>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                        Message
                                    </p>
                                    <p className="whitespace-pre-wrap text-sm text-gray-200">{request.message}</p>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <DetailField
                                        label="Verification status"
                                        value={request.verificationStatus.replace(/_/g, " ")}
                                    />
                                    <DetailField
                                        label="Failure reasons"
                                        value={
                                            request.failureReasons?.length
                                                ? request.failureReasons.join(", ")
                                                : "-"
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Attention Queue
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        Sessions that need human action or operational follow-up.
                    </p>
                </div>

                {overview.attentionSessions.length === 0 ? (
                    <p className="text-sm text-gray-400">No sessions currently need review.</p>
                ) : (
                    <div className="space-y-4">
                        {overview.attentionSessions.map((session) => (
                            <details
                                key={session.sessionId}
                                className="group rounded-xl border border-white/10 bg-black/20 p-4 open:border-pink-500/30 open:bg-pink-500/[0.04]"
                            >
                                <summary className="mb-3 flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={session.status} />
                                            <span className="text-xs text-gray-500">
                                                Attempt {session.attemptNumber}
                                            </span>
                                            <span className="text-xs text-pink-300 opacity-0 transition group-open:opacity-100">
                                                Details open
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{session.displayName}</p>
                                            <p className="text-sm text-gray-400">{session.email}</p>
                                            <p className="text-xs text-gray-500">
                                                {session.contactPhoneNumber || "No phone number on file"}
                                            </p>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            <p>Session: {session.sessionId}</p>
                                            <p>Updated: {formatDate(session.updatedAt)}</p>
                                            <p>Expires: {formatDate(session.expiresAt)}</p>
                                        </div>
                                    </div>

                                    <div className="max-w-md text-xs text-gray-400">
                                        {session.failureReasons?.length > 0 ? (
                                            <p>Reasons: {session.failureReasons.join(", ")}</p>
                                        ) : (
                                            <p>No failure reasons recorded yet.</p>
                                        )}
                                        {session.isExpiredProcessing ? (
                                            <p className="mt-2 text-yellow-300">This processing session has expired.</p>
                                        ) : null}
                                        <p className="mt-3 text-pink-200">Click to inspect profile and contact details</p>
                                    </div>
                                </summary>

                                <div className="mb-4 grid gap-4 border-t border-white/10 pt-4 xl:grid-cols-[1fr,1.2fr]">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                Contact + Profile
                                            </h3>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <DetailField label="Email" value={session.email} />
                                                <DetailField label="Phone" value={session.contactPhoneNumber} />
                                                <DetailField label="Course" value={session.course} />
                                                <DetailField label="University" value={session.university} />
                                                <DetailField label="Age" value={session.age} />
                                                <DetailField label="Gender" value={session.gender} />
                                                <DetailField label="Education" value={session.education} />
                                                <DetailField label="Location" value={session.currentLocation} />
                                                <DetailField label="Created" value={formatDate(session.userCreatedAt)} />
                                                <DetailField label="Last active" value={formatDate(session.userLastActive)} />
                                            </div>
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <DetailField
                                                label="Interests"
                                                value={<ChipList items={session.interests} />}
                                            />
                                            <DetailField
                                                label="Qualities"
                                                value={<ChipList items={session.qualities} />}
                                            />
                                        </div>

                                        <DetailField
                                            label="Bio / About"
                                            value={session.aboutMe || session.bio || null}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                Profile Photos
                                            </h3>
                                            {session.profileImages.length === 0 ? (
                                                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                                                    No profile photos are available. Selfie images are intentionally not shown here.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                                    {session.profileImages.map((photoUrl) => (
                                                        <a
                                                            key={photoUrl}
                                                            href={photoUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="group/photo overflow-hidden rounded-xl border border-white/10 bg-black/30"
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={photoUrl}
                                                                alt={`${session.displayName} profile photo`}
                                                                className="aspect-square w-full object-cover transition group-hover/photo:scale-105"
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                Verification Issue
                                            </h3>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <DetailField label="Profile status" value={session.profileFaceVerificationStatus} />
                                                <DetailField label="Retry count" value={session.faceVerificationRetryCount} />
                                                <DetailField label="Profile completed" value={session.profileCompleted || session.isComplete ? "Yes" : "No"} />
                                                <DetailField label="Threshold version" value={session.thresholdConfigVersion} />
                                            </div>
                                            <div className="mt-3">
                                                <DetailField
                                                    label="Failure reasons"
                                                    value={<ChipList items={session.failureReasons} />}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4 grid gap-4 xl:grid-cols-2">
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                            Comparison Results
                                        </h3>
                                        {session.results.length === 0 ? (
                                            <p className="text-sm text-gray-500">No comparison results recorded.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {session.results.map((result) => (
                                                    <div
                                                        key={`${result.sourceAssetKey}-${result.targetAssetKey}-${result.createdAt}`}
                                                        className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-300"
                                                    >
                                                        <div className="mb-2 flex flex-wrap gap-2">
                                                            <span className="font-semibold text-white">{result.decision}</span>
                                                            <span>Similarity: {result.similarity ?? "-"}</span>
                                                            <span>Faces: {result.facesDetected}</span>
                                                            <span>Confidence: {result.faceConfidence ?? "-"}</span>
                                                        </div>
                                                        <p className="break-all text-gray-500">Source: {result.sourceAssetKey}</p>
                                                        <p className="break-all text-gray-500">Target: {result.targetAssetKey}</p>
                                                        {result.qualityFlags.length > 0 ? (
                                                            <div className="mt-2">
                                                                <ChipList items={result.qualityFlags} />
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                            Jobs + Asset Health
                                        </h3>
                                        <div className="space-y-2">
                                            {session.jobs.length === 0 ? (
                                                <p className="text-sm text-gray-500">No jobs recorded for this session.</p>
                                            ) : (
                                                session.jobs.map((job) => (
                                                    <div
                                                        key={`${job.jobType}-${job.createdAt}-${job.assetKey ?? "session"}`}
                                                        className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-300"
                                                    >
                                                        <div className="mb-1 flex flex-wrap gap-2">
                                                            <span className="font-semibold text-white">{job.jobType}</span>
                                                            <span>{job.status}</span>
                                                            <span>
                                                                Attempts {job.attempts}/{job.maxAttempts}
                                                            </span>
                                                        </div>
                                                        {job.assetKey ? <p className="break-all text-gray-500">Asset: {job.assetKey}</p> : null}
                                                        {job.lastError ? <p className="mt-1 text-red-200">{job.lastError}</p> : null}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <form action={processVerificationSessionAction}>
                                        <input type="hidden" name="sessionId" value={session.sessionId} />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-blue-500/30 bg-blue-500/15 px-3 py-2 text-xs font-medium text-blue-200 hover:bg-blue-500/25"
                                        >
                                            Reprocess
                                        </button>
                                    </form>

                                    <form action={reviewVerificationSessionAction}>
                                        <input type="hidden" name="sessionId" value={session.sessionId} />
                                        <input type="hidden" name="status" value="verified" />
                                        <input type="hidden" name="reason" value="admin_verified_after_review" />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-green-500/30 bg-green-500/15 px-3 py-2 text-xs font-medium text-green-200 hover:bg-green-500/25"
                                        >
                                            Approve
                                        </button>
                                    </form>

                                    <form action={reviewVerificationSessionAction}>
                                        <input type="hidden" name="sessionId" value={session.sessionId} />
                                        <input type="hidden" name="status" value="failed" />
                                        <input type="hidden" name="reason" value="admin_failed_after_review" />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/25"
                                        >
                                            Fail
                                        </button>
                                    </form>

                                    <form action={reviewVerificationSessionAction}>
                                        <input type="hidden" name="sessionId" value={session.sessionId} />
                                        <input type="hidden" name="status" value="blocked" />
                                        <input type="hidden" name="reason" value="admin_blocked_account_review" />
                                        <button
                                            type="submit"
                                            className="rounded-lg border border-red-700/30 bg-red-700/15 px-3 py-2 text-xs font-medium text-red-100 hover:bg-red-700/25"
                                        >
                                            Block
                                        </button>
                                    </form>
                                </div>
                            </details>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Recent Processed Sessions
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-gray-500">
                                <th className="px-3 py-3">User</th>
                                <th className="px-3 py-3">Status</th>
                                <th className="px-3 py-3">Attempt</th>
                                <th className="px-3 py-3">Duration</th>
                                <th className="px-3 py-3">Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overview.recentProcessedSessions.map((session) => (
                                <tr key={session.sessionId} className="border-b border-white/5 last:border-0">
                                    <td className="px-3 py-3">
                                        <div>
                                            <p className="font-medium text-white">{session.displayName}</p>
                                            <p className="text-xs text-gray-500">{session.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <StatusBadge status={session.status} />
                                    </td>
                                    <td className="px-3 py-3 text-gray-300">{session.attemptNumber}</td>
                                    <td className="px-3 py-3 text-gray-300">
                                        {session.durationSeconds ?? "-"}
                                    </td>
                                    <td className="px-3 py-3 text-gray-400">
                                        {new Date(session.updatedAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
