"use client";

import { useState, useEffect } from "react";

interface TokenInfo {
    valid: boolean;
    profileName: string;
    profilePhoto: string | null;
    remainingUses: number;
    expiresAt: string;
}

interface HypeWriteFormProps {
    token: string;
}

type Step = "loading" | "invalid" | "write" | "submitting" | "success" | "error";

export function HypeWriteForm({ token }: HypeWriteFormProps) {
    const [step, setStep] = useState<Step>("loading");
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [authorName, setAuthorName] = useState("");
    const [content, setContent] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Validate the token on mount
    useEffect(() => {
        const validate = async () => {
            try {
                const res = await fetch(`/api/hype/write?token=${token}`);
                const json = await res.json();

                if (!res.ok || !json.data?.valid) {
                    setErrorMsg(json.error || "This invite link is invalid or expired.");
                    setStep("invalid");
                    return;
                }

                setTokenInfo(json.data);
                setStep("write");
            } catch {
                setErrorMsg("Could not reach StrathSpace. Please try again.");
                setStep("invalid");
            }
        };

        validate();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authorName.trim() || !content.trim()) return;

        setStep("submitting");
        try {
            const res = await fetch("/api/hype/write", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, authorName: authorName.trim(), content: content.trim() }),
            });

            const json = await res.json();
            if (!res.ok) {
                setErrorMsg(json.error || "Submission failed. Please try again.");
                setStep("error");
                return;
            }

            setStep("success");
        } catch {
            setErrorMsg("Something went wrong. Please try again.");
            setStep("error");
        }
    };

    // ─── Loading ─────────────────────────────────────────────────────────────
    if (step === "loading") {
        return (
            <div className="min-h-screen bg-[#0f0d23] flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Checking your link…</p>
                </div>
            </div>
        );
    }

    // ─── Invalid / gone ──────────────────────────────────────────────────────
    if (step === "invalid") {
        return (
            <PageShell>
                <div className="text-center space-y-3">
                    <span className="text-5xl">😕</span>
                    <h1 className="text-xl font-bold text-white">Link not found</h1>
                    <p className="text-slate-400 text-sm">{errorMsg}</p>
                    <p className="text-slate-500 text-xs mt-4">
                        Ask your friend to send you a fresh invite link.
                    </p>
                </div>
            </PageShell>
        );
    }

    // ─── Success ─────────────────────────────────────────────────────────────
    if (step === "success") {
        return (
            <PageShell>
                <div className="text-center space-y-3">
                    <span className="text-6xl">🔥</span>
                    <h1 className="text-2xl font-bold text-white">You hyped them up!</h1>
                    <p className="text-slate-400">
                        Your vouch for <span className="text-pink-400 font-semibold">{tokenInfo?.profileName}</span> has been submitted.
                    </p>
                    <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-slate-300 text-sm italic">"{content}"</p>
                        <p className="text-slate-500 text-xs mt-2">— {authorName}</p>
                    </div>
                    <p className="text-slate-600 text-xs mt-4">
                        Want to find your own campus match?
                    </p>
                    <a
                        href="https://www.strathspace.com"
                        className="inline-block mt-2 px-6 py-3 rounded-full font-semibold text-sm text-white"
                        style={{ background: "linear-gradient(90deg, #ec4899, #f43f5e)" }}
                    >
                        Join StrathSpace 💘
                    </a>
                </div>
            </PageShell>
        );
    }

    // ─── Error (post-submission) ──────────────────────────────────────────────
    if (step === "error") {
        return (
            <PageShell>
                <div className="text-center space-y-3">
                    <span className="text-5xl">😬</span>
                    <h1 className="text-xl font-bold text-white">Submission failed</h1>
                    <p className="text-slate-400 text-sm">{errorMsg}</p>
                    <button
                        onClick={() => setStep("write")}
                        className="mt-4 px-5 py-2 rounded-full text-sm font-medium text-white"
                        style={{ background: "linear-gradient(90deg, #ec4899, #f43f5e)" }}
                    >
                        Try again
                    </button>
                </div>
            </PageShell>
        );
    }

    // ─── Write form ───────────────────────────────────────────────────────────
    const remaining = 200 - content.length;
    const isSubmitting = step === "submitting";

    return (
        <PageShell>
            {/* Profile preview */}
            <div className="flex flex-col items-center gap-3 mb-6">
                {tokenInfo?.profilePhoto ? (
                    <img
                        src={tokenInfo.profilePhoto}
                        alt={tokenInfo?.profileName}
                        className="w-20 h-20 rounded-full object-cover border-2 border-pink-500/40"
                    />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <span className="text-3xl">🔥</span>
                    </div>
                )}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white">
                        Hype {tokenInfo?.profileName}!
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Write a short vouch for their StrathSpace profile.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Author name */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Your name
                    </label>
                    <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="e.g. Your campus buddy 👋"
                        maxLength={50}
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60 text-sm transition-colors"
                    />
                </div>

                {/* Vouch content */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Your hype (max 200 chars)
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value.slice(0, 200))}
                        placeholder={`What would you say about ${tokenInfo?.profileName}? 🤔`}
                        required
                        rows={4}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60 text-sm resize-none transition-colors"
                    />
                    <p className={`text-xs mt-1 text-right ${remaining < 20 ? "text-amber-400" : "text-slate-500"}`}>
                        {remaining} chars left
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !authorName.trim() || !content.trim()}
                    className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    style={{ background: "linear-gradient(90deg, #ec4899, #f43f5e)" }}
                >
                    {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            Sending hype…
                        </span>
                    ) : (
                        "Send the hype 🔥"
                    )}
                </button>

                <p className="text-center text-slate-600 text-xs">
                    No account needed • Vouches are approved by {tokenInfo?.profileName}
                </p>
            </form>
        </PageShell>
    );
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0f0d23] flex items-center justify-center p-6">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <span className="text-3xl font-black tracking-tight text-white">
                        Strath<span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #ec4899, #f43f5e)" }}>Space</span>
                    </span>
                </div>

                <div className="rounded-3xl border border-white/10 p-6" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
