"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export interface PaymentCheckoutClientProps {
    paymentToken: string;
    dateMatchId: string;
    amount: number;
    currency: string;
    partnerFirstName: string;
    scheduledAtLabel: string | null;
    currentUserPaid: boolean;
    canPay: boolean;
    blockReason: string | null;
    appReturnUrl: string;
}

export function PaymentCheckoutClient(props: PaymentCheckoutClientProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const amountLabel = `${props.currency} ${props.amount.toLocaleString("en-KE")}`;

    const handlePay = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/payments/create-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dateMatchId: props.dateMatchId,
                    paymentToken: props.paymentToken,
                }),
            });
            const json = await res.json();

            if (!res.ok || !json.success) {
                setError(json.error || "Could not start payment. Please try again.");
                return;
            }

            window.location.href = json.data.authorizationUrl as string;
        } catch {
            setError("Could not reach StrathSpace. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    if (props.currentUserPaid) {
        return (
            <div className="space-y-6 text-center">
                <h1 className="text-2xl font-semibold text-white">You&apos;re confirmed</h1>
                <p className="text-zinc-400">
                    Waiting for {props.partnerFirstName} to confirm their Date Setup Fee.
                </p>
                <a
                    href={props.appReturnUrl}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-white px-6 text-sm font-medium text-zinc-950"
                >
                    Return to StrathSpace
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center">
                <p className="text-sm font-medium uppercase tracking-wider text-violet-300/90">
                    Date Setup Fee
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                    Confirm your date
                </h1>
                <p className="text-sm text-zinc-400">
                    A one-time fee helps us coordinate your date with {props.partnerFirstName} and
                    keep StrathSpace intentional. This is not a subscription.
                </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-center text-4xl font-semibold text-white">{amountLabel}</p>
                {props.scheduledAtLabel ? (
                    <p className="mt-2 text-center text-sm text-zinc-400">
                        Proposed time: {props.scheduledAtLabel}
                    </p>
                ) : null}
                <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                    <li>Date coordination by StrathSpace</li>
                    <li>Confirmation with both people</li>
                    <li>Venue and time scheduling</li>
                    <li>Pre-date support</li>
                </ul>
            </div>

            {props.blockReason ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {props.blockReason}
                </p>
            ) : null}

            {error ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {error}
                </p>
            ) : null}

            <Button
                type="button"
                className="h-12 w-full rounded-xl bg-white text-base font-semibold text-zinc-950 hover:bg-zinc-100"
                disabled={!props.canPay || loading}
                onClick={handlePay}
            >
                {loading ? "Starting checkout…" : `Pay ${amountLabel} to confirm`}
            </Button>

            <p className="text-center text-xs text-zinc-500">
                By paying, you agree to StrathSpace&apos;s{" "}
                <Link href="/terms" className="underline underline-offset-2 hover:text-zinc-300">
                    Terms of Service
                </Link>
                .
            </p>
        </div>
    );
}
