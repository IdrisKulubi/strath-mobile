"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
    runPhotoBackfillAction,
    reanalyzeUserPhotosAction,
} from "./_actions";

import type {
    LowQualityProfileRow,
    NeedsReviewPhotoRow,
} from "@/lib/services/photo-intelligence-admin";

function StatusMessage({ message, tone }: { message: string; tone: "success" | "error" | "info" }) {
    const tones = {
        success: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
        error: "text-red-300 bg-red-500/10 border-red-500/20",
        info: "text-sky-300 bg-sky-500/10 border-sky-500/20",
    };

    return (
        <p className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}>
            {message}
        </p>
    );
}

export function PhotoOpsPanel({
    lowQualityProfiles,
    needsReviewPhotos,
}: {
    lowQualityProfiles: LowQualityProfileRow[];
    needsReviewPhotos: NeedsReviewPhotoRow[];
}) {
    const [userId, setUserId] = useState("");
    const [status, setStatus] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
    const [isPending, startTransition] = useTransition();

    const runAction = (action: () => Promise<{ ok: boolean; message: string }>) => {
        startTransition(async () => {
            const result = await action();
            setStatus({
                message: result.message,
                tone: result.ok ? "success" : "error",
            });
        });
    };

    return (
        <div className="space-y-8">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Operations
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    Re-run analysis or backfill embeddings. These call the existing admin photo-quality APIs.
                </p>

                <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="flex-1">
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                            Reanalyze user
                        </label>
                        <Input
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder="User ID"
                            className="bg-black/20 border-white/10 text-white"
                        />
                    </div>
                    <Button
                        type="button"
                        disabled={isPending || !userId.trim()}
                        onClick={() =>
                            runAction(() => reanalyzeUserPhotosAction(userId.trim()))
                        }
                        className="bg-pink-500 hover:bg-pink-600 text-white"
                    >
                        Reanalyze
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => {
                            if (!window.confirm("Run embedding backfill batch (limit 25)?")) return;
                            runAction(() => runPhotoBackfillAction({ limit: 25 }));
                        }}
                        className="border-white/15 text-white hover:bg-white/10"
                    >
                        Backfill batch
                    </Button>
                </div>

                {status ? (
                    <div className="mt-4">
                        <StatusMessage message={status.message} tone={status.tone} />
                    </div>
                ) : null}

                <p className="mt-4 text-xs text-gray-500">
                    Photo audit queue:{" "}
                    <Link href="/admin/verification" className="text-pink-300 hover:text-white">
                        open Verification admin
                    </Link>
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <h3 className="text-sm font-semibold text-white">Low-quality profiles</h3>
                    <p className="mt-1 text-xs text-gray-500">Score below 45 (top 20)</p>
                    {lowQualityProfiles.length === 0 ? (
                        <p className="mt-6 text-sm text-gray-500">No low-quality profiles found.</p>
                    ) : (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
                                        <th className="py-2 pr-3">User</th>
                                        <th className="py-2 pr-3">Score</th>
                                        <th className="py-2">Usable</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowQualityProfiles.map((row) => (
                                        <tr key={row.userId} className="border-b border-white/5 text-gray-300">
                                            <td className="py-2 pr-3">
                                                <div className="font-medium text-white">
                                                    {row.firstName || "Unknown"}
                                                </div>
                                                <div className="text-xs text-gray-500">{row.userId}</div>
                                            </td>
                                            <td className="py-2 pr-3">{row.photoQualityScore}</td>
                                            <td className="py-2">
                                                {row.hasUsableProfilePhoto ? "Yes" : "No"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <h3 className="text-sm font-semibold text-white">Needs review</h3>
                    <p className="mt-1 text-xs text-gray-500">Moderation queue (top 20)</p>
                    {needsReviewPhotos.length === 0 ? (
                        <p className="mt-6 text-sm text-gray-500">No photos waiting for review.</p>
                    ) : (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
                                        <th className="py-2 pr-3">User</th>
                                        <th className="py-2 pr-3">Score</th>
                                        <th className="py-2">Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {needsReviewPhotos.map((row) => (
                                        <tr key={row.analysisId} className="border-b border-white/5 text-gray-300">
                                            <td className="py-2 pr-3">
                                                <div className="font-medium text-white">
                                                    {row.firstName || "Unknown"}
                                                </div>
                                                <div className="text-xs text-gray-500">{row.userId}</div>
                                            </td>
                                            <td className="py-2 pr-3">{row.qualityScore}</td>
                                            <td className="py-2 text-xs text-gray-400">
                                                {row.moderationReason || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
