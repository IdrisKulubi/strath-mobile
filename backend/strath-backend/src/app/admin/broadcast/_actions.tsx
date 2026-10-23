"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
    type BroadcastAudience,
    getAdminBroadcastAudienceCount,
    sendAdminBroadcast,
} from "@/lib/actions/admin";

type AudienceOption = {
    value: BroadcastAudience;
    label: string;
    description: string;
};

const AUDIENCE_OPTIONS: AudienceOption[] = [
    { value: "everyone", label: "Everyone", description: "All users with push notifications on" },
    { value: "admitted", label: "Admitted only", description: "Users currently using the app" },
    { value: "waitlisted", label: "Waitlisted only", description: "Users waiting for a spot" },
    { value: "guys", label: "Guys only", description: "Users with gender = male" },
    { value: "ladies", label: "Ladies only", description: "Users with gender = female" },
    { value: "other", label: "Other", description: "Users with no gender set or other" },
];

interface BroadcastHistoryItem {
    id: string;
    title: string;
    body: string;
    audience: string;
    recipientCount: number;
    successCount: number;
    failureCount: number;
    sentAt: string;
}

export function BroadcastComposer() {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [audience, setAudience] = useState<BroadcastAudience>("everyone");
    const [audienceCount, setAudienceCount] = useState<number | null>(null);
    const [result, setResult] = useState<{
        recipientCount: number;
        successCount: number;
        failureCount: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;
        setAudienceCount(null);
        getAdminBroadcastAudienceCount(audience)
            .then((n) => {
                if (!cancelled) setAudienceCount(n);
            })
            .catch(() => {
                if (!cancelled) setAudienceCount(null);
            });
        return () => {
            cancelled = true;
        };
    }, [audience]);

    const canSend = title.trim().length > 0 && body.trim().length > 0 && !isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setResult(null);

        const human = AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label ?? audience;
        const confirmMsg = `Send this push to ~${audienceCount ?? "?"} users (${human})?`;
        if (!window.confirm(confirmMsg)) return;

        const formData = new FormData();
        formData.set("title", title);
        formData.set("body", body);
        formData.set("audience", audience);

        startTransition(async () => {
            try {
                const r = await sendAdminBroadcast(formData);
                setResult(r);
                setTitle("");
                setBody("");
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to send");
            }
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-white/10 bg-white/5 p-6"
        >
            <div className="space-y-4">
                <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={80}
                        placeholder="You're in 💛"
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">{title.length}/80</p>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Message
                    </label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={240}
                        rows={4}
                        placeholder="A spot opened up on Strathspace. Tap to meet your first match."
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">{body.length}/240</p>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Audience
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {AUDIENCE_OPTIONS.map((opt) => {
                            const selected = audience === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setAudience(opt.value)}
                                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                                        selected
                                            ? "border-emerald-400/60 bg-emerald-500/10"
                                            : "border-white/10 bg-white/5 hover:bg-white/10"
                                    }`}
                                >
                                    <p className="text-sm font-semibold text-white">{opt.label}</p>
                                    <p className="text-[11px] text-gray-400">{opt.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Preview</p>
                    <div className="mt-2 rounded-md bg-white/5 p-3">
                        <p className="text-sm font-semibold text-white">
                            {title || "Title goes here"}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-300">
                            {body || "Your message will appear here"}
                        </p>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">
                        Sending to{" "}
                        <span className="font-semibold text-white">
                            {audienceCount ?? "…"}
                        </span>{" "}
                        user{audienceCount === 1 ? "" : "s"} with push enabled
                    </p>
                </div>

                {error && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                        Sent to {result.recipientCount} devices — {result.successCount} delivered,{" "}
                        {result.failureCount} failed.
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!canSend}
                    className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-40"
                >
                    {isPending ? "Sending..." : `Send to ${audienceCount ?? "?"} users`}
                </button>
            </div>
        </form>
    );
}

export function BroadcastHistory({ history }: { history: BroadcastHistoryItem[] }) {
    if (history.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm font-semibold text-white">Recent broadcasts</p>
                <p className="mt-2 text-xs text-gray-400">
                    Nothing sent yet. Broadcasts you send will show up here.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-white">Recent broadcasts</p>
            <div className="mt-4 space-y-3">
                {history.map((item) => (
                    <div
                        key={item.id}
                        className="rounded-lg border border-white/10 bg-black/20 p-3"
                    >
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-300">{item.body}</p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                            <span>
                                {item.audience} · {item.recipientCount} devices
                            </span>
                            <span>
                                {new Date(item.sentAt).toLocaleString("en-KE", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                })}
                            </span>
                        </div>
                        {item.failureCount > 0 && (
                            <p className="mt-1 text-[11px] text-amber-300">
                                {item.failureCount} failed
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
