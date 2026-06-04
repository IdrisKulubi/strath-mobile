"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type CallbackState = "loading" | "success" | "failed" | "pending";

interface PaymentCallbackClientProps {
    reference: string | null;
    appReturnUrl: string;
}

export function PaymentCallbackClient({ reference, appReturnUrl }: PaymentCallbackClientProps) {
    const [state, setState] = useState<CallbackState>(reference ? "loading" : "failed");
    const [message, setMessage] = useState<string | null>(
        reference ? null : "Missing payment reference.",
    );

    useEffect(() => {
        if (!reference) return;

        const verify = async () => {
            try {
                const res = await fetch("/api/payments/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reference }),
                });

                if (res.status === 404) {
                    setState("pending");
                    setMessage(
                        "Payment received. Confirmation will complete shortly — return to the app.",
                    );
                    return;
                }

                const json = await res.json();

                if (res.ok && json.success && json.data?.success) {
                    setState("success");
                    setMessage("Your Date Setup Fee is confirmed.");
                    return;
                }

                setState("failed");
                setMessage(json.error || "We could not confirm this payment.");
            } catch {
                setState("pending");
                setMessage(
                    "Payment may have gone through. Return to StrathSpace to see your updated status.",
                );
            }
        };

        void verify();
    }, [reference]);

    const refQuery = reference ? `?reference=${encodeURIComponent(reference)}` : "";
    const deepLink =
        state === "failed"
            ? `strathspace://payments/failed${refQuery}`
            : `strathspace://payments/success${refQuery}`;

    const title =
        state === "loading"
            ? "Confirming payment…"
            : state === "success"
              ? "Payment confirmed"
              : state === "pending"
                ? "Almost there"
                : "Payment issue";

    return (
        <div className="space-y-6 text-center">
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            {state === "loading" ? (
                <p className="text-sm text-zinc-400">Please wait a moment.</p>
            ) : (
                <p className="text-sm text-zinc-400">{message}</p>
            )}

            <Button
                asChild
                className="h-11 w-full rounded-xl bg-white text-zinc-950 hover:bg-zinc-100"
            >
                <a href={deepLink}>Return to StrathSpace</a>
            </Button>

            <p className="text-xs text-zinc-500">
                If the app does not open, switch back to StrathSpace manually.
            </p>

            <Link href="/" className="text-xs text-zinc-600 underline-offset-2 hover:text-zinc-400">
                strathspace.com
            </Link>
        </div>
    );
}
