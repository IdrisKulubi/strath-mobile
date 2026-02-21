"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface TokenInfo {
    valid: boolean;
    profileName: string;
    profilePhoto: string | null;
    roundNumber: number;
    remainingSubmissions: number;
    expiresAt: string;
}

interface WingmanWriteFormProps {
    token: string;
}

type Step = "loading" | "invalid" | "write" | "submitting" | "success" | "error";

function parseCsv(input: string, max: number) {
    return input
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max);
}

export function WingmanWriteForm({ token }: WingmanWriteFormProps) {
    const [step, setStep] = useState<Step>("loading");
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

    const [authorName, setAuthorName] = useState("");
    const [relationship, setRelationship] = useState("");
    const [threeWords, setThreeWords] = useState("");
    const [greenFlags, setGreenFlags] = useState("");
    const [redFlagFunny, setRedFlagFunny] = useState("");
    const [hypeNote, setHypeNote] = useState("");

    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const validate = async () => {
            try {
                const res = await fetch(`/api/wingman/submit?token=${token}`);
                const json = await res.json();

                if (!res.ok || !json.data?.valid) {
                    setErrorMsg(json.error || "This link is invalid or expired.");
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

    const wordsArray = useMemo(() => parseCsv(threeWords, 5), [threeWords]);
    const greenArray = useMemo(() => parseCsv(greenFlags, 5), [greenFlags]);

    const canSubmit =
        authorName.trim().length > 0 &&
        wordsArray.length > 0 &&
        step !== "submitting";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setStep("submitting");
        try {
            const res = await fetch("/api/wingman/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    authorName: authorName.trim(),
                    relationship: relationship.trim() || null,
                    threeWords: wordsArray,
                    greenFlags: greenArray,
                    redFlagFunny: redFlagFunny.trim() || null,
                    hypeNote: hypeNote.trim() || null,
                }),
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

    if (step === "invalid") {
        return (
            <PageShell>
                <div className="text-center space-y-3">
                    <span className="text-5xl">😕</span>
                    <h1 className="text-xl font-bold text-white">Link not found</h1>
                    <p className="text-slate-400 text-sm">{errorMsg}</p>
                    <p className="text-slate-500 text-xs mt-4">
                        Ask your friend to send you a fresh Wingman link.
                    </p>
                </div>
            </PageShell>
        );
    }

    if (step === "success") {
        return (
            <PageShell>
                <div className="text-center space-y-3">
                    <span className="text-6xl">🪽</span>
                    <h1 className="text-2xl font-bold text-white">Wingman sent!</h1>
                    <p className="text-slate-400">
                        Your answers for{" "}
                        <span className="text-pink-400 font-semibold">{tokenInfo?.profileName}</span> are in.
                    </p>
                    <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-slate-300 text-sm">
                            <span className="text-slate-500">3 words:</span> {wordsArray.join(", ")}
                        </p>
                        {greenArray.length > 0 ? (
                            <p className="text-slate-300 text-sm mt-2">
                                <span className="text-slate-500">Green flags:</span> {greenArray.join(", ")}
                            </p>
                        ) : null}
                        <p className="text-slate-500 text-xs mt-3">— {authorName}</p>
                    </div>
                    <a
                        href="https://www.strathspace.com"
                        className="inline-block mt-4 px-6 py-3 rounded-full font-semibold text-sm text-white"
                        style={{ background: "linear-gradient(90deg, #ec4899, #f43f5e)" }}
                    >
                        Join StrathSpace 💘
                    </a>
                </div>
            </PageShell>
        );
    }

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

    const isSubmitting = step === "submitting";

    return (
        <PageShell>
            <div className="flex flex-col items-center gap-3 mb-6">
                {tokenInfo?.profilePhoto ? (
                    <Image
                        src={tokenInfo.profilePhoto}
                        alt={tokenInfo?.profileName || "Profile photo"}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-full object-cover border-2 border-pink-500/40"
                    />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <span className="text-3xl">🪽</span>
                    </div>
                )}

                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white">Be a Wingman 🪽</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Help <span className="text-pink-400 font-semibold">{tokenInfo?.profileName}</span> get better matches.
                    </p>
                    <p className="text-slate-600 text-xs mt-2">
                        Round {tokenInfo?.roundNumber} • {tokenInfo?.remainingSubmissions} spots left
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Your name
                    </label>
                    <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="e.g. Your friend 👋"
                        maxLength={50}
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60 text-sm transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        How do you know them? (optional)
                    </label>
                    <input
                        type="text"
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        placeholder="e.g. roommate, classmate, bestie"
                        maxLength={30}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60 text-sm transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        3 words to describe them (comma separated)
                    </label>
                    <input
                        type="text"
                        value={threeWords}
                        onChange={(e) => setThreeWords(e.target.value)}
                        placeholder="funny, kind, ambitious"
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60 text-sm transition-colors"
                    />
                    <p className="text-slate-600 text-xs mt-1">We’ll use the first {Math.max(3, Math.min(5, wordsArray.length))} words.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Green flags (optional, comma separated)
                    </label>
                    <input
                        type="text"
                        value={greenFlags}
                        onChange={(e) => setGreenFlags(e.target.value)}
                        placeholder="good communicator, loyal, respectful"
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60 text-sm transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Funny red flag (optional)
                    </label>
                    <input
                        type="text"
                        value={redFlagFunny}
                        onChange={(e) => setRedFlagFunny(e.target.value.slice(0, 120))}
                        placeholder="e.g. will steal your fries"
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60 text-sm transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        One-line hype (optional)
                    </label>
                    <textarea
                        value={hypeNote}
                        onChange={(e) => setHypeNote(e.target.value.slice(0, 200))}
                        placeholder="What should a match know about them?"
                        rows={3}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60 text-sm resize-none transition-colors"
                    />
                </div>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    style={{ background: "linear-gradient(90deg, #ec4899, #f43f5e)" }}
                >
                    {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            Sending…
                        </span>
                    ) : (
                        "Send Wingman 🪽"
                    )}
                </button>

                <p className="text-center text-slate-600 text-xs">
                    No account needed • Takes 20 seconds
                </p>
            </form>
        </PageShell>
    );
}

function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0f0d23] flex items-center justify-center p-6">
            <div className="w-full max-w-md">{children}</div>
        </div>
    );
}
