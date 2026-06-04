"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
    adminAddPaymentNote,
    adminFlagLowIntent,
    adminInitiateRefund,
    adminIssueCredit,
} from "@/lib/actions/admin-payments";

function ActionMessage({ message, tone }: { message: string; tone: "ok" | "err" }) {
    return (
        <p
            className={`text-xs ${tone === "ok" ? "text-emerald-300" : "text-red-300"}`}
            role="status"
        >
            {message}
        </p>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="mb-1.5 block text-[12px] font-medium text-white/50">{children}</label>
    );
}

const inputClass =
    "w-full rounded-lg border border-white/[0.08] bg-[#141118] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-[#B8327A]/50 focus:ring-2 focus:ring-[#B8327A]/20";

const buttonPrimary =
    "inline-flex items-center justify-center rounded-lg bg-[#B8327A] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const buttonGhost =
    "inline-flex items-center justify-center rounded-lg bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/80 ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.1] disabled:opacity-50";

export function PaymentAdminActions({
    dateMatchId,
    participants,
}: {
    dateMatchId: string;
    participants: Array<{
        paymentId: string | null;
        userId: string;
        user: { firstName: string; name: string };
        status: string;
        paystackTransactionId: string | null;
    }>;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
    const [note, setNote] = useState("");
    const [creditUserId, setCreditUserId] = useState(participants[0]?.userId ?? "");

    function run(action: () => Promise<{ ok: boolean; reason?: string }>) {
        setMessage(null);
        startTransition(async () => {
            const result = await action();
            if (result.ok) {
                setMessage({ text: "Saved", tone: "ok" });
                router.refresh();
            } else {
                setMessage({ text: result.reason ?? "Something went wrong", tone: "err" });
            }
        });
    }

    return (
        <div className="space-y-6">
            <section className="rounded-xl border border-white/[0.08] bg-[#221C2A]/50 p-4 ring-1 ring-inset ring-white/[0.04]">
                <h3 className="text-sm font-semibold text-white">Internal note</h3>
                <p className="mt-1 text-[12px] text-white/40">
                    Append a timestamped note visible to ops on this match.
                </p>
                <div className="mt-3">
                    <FieldLabel>Note</FieldLabel>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className={inputClass}
                        placeholder="Called user, waiting on M-Pesa…"
                    />
                </div>
                <div className="mt-3 flex items-center gap-3">
                    <button
                        type="button"
                        disabled={pending || !note.trim()}
                        className={buttonPrimary}
                        onClick={() =>
                            run(() => adminAddPaymentNote({ dateMatchId, note }))
                        }
                    >
                        Save note
                    </button>
                    {message ? <ActionMessage message={message.text} tone={message.tone} /> : null}
                </div>
            </section>

            <section className="rounded-xl border border-white/[0.08] bg-[#221C2A]/50 p-4 ring-1 ring-inset ring-white/[0.04]">
                <h3 className="text-sm font-semibold text-white">Issue credit</h3>
                <p className="mt-1 text-[12px] text-white/40">
                    Adds an active KES 499 credit (default amount) with reason admin_credit.
                </p>
                <div className="mt-3">
                    <FieldLabel>User</FieldLabel>
                    <select
                        value={creditUserId}
                        onChange={(e) => setCreditUserId(e.target.value)}
                        className={inputClass}
                    >
                        {participants.map((p) => (
                            <option key={p.userId} value={p.userId}>
                                {p.user.name || p.user.firstName}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    disabled={pending || !creditUserId}
                    className={`${buttonPrimary} mt-3`}
                    onClick={() =>
                        run(() =>
                            adminIssueCredit({ userId: creditUserId, dateMatchId }),
                        )
                    }
                >
                    Issue credit
                </button>
            </section>

            <section className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Per user</h3>
                {participants.map((p) => (
                    <div
                        key={p.userId}
                        className="rounded-xl border border-white/[0.08] bg-[#221C2A]/40 p-4 ring-1 ring-inset ring-white/[0.04]"
                    >
                        <p className="font-medium text-white">
                            {p.user.name || p.user.firstName}
                        </p>
                        <p className="mt-0.5 text-[11px] capitalize text-white/40">
                            Payment: {p.status.replace(/_/g, " ")}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={pending}
                                className={buttonGhost}
                                onClick={() =>
                                    run(() =>
                                        adminFlagLowIntent({
                                            userId: p.userId,
                                            dateMatchId,
                                        }),
                                    )
                                }
                            >
                                Flag low intent
                            </button>
                            {p.paymentId &&
                            (p.status === "paid" || p.status === "credited") &&
                            p.paystackTransactionId ? (
                                <button
                                    type="button"
                                    disabled={pending || p.status === "refund_requested"}
                                    className={buttonPrimary}
                                    onClick={() =>
                                        run(() =>
                                            adminInitiateRefund({
                                                paymentId: p.paymentId!,
                                            }),
                                        )
                                    }
                                >
                                    {p.status === "refund_requested"
                                        ? "Refund pending"
                                        : "Initiate refund"}
                                </button>
                            ) : null}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}
