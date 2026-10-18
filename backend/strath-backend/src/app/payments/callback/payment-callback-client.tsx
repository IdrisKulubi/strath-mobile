"use client";

import Link from "next/link";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { paymentBrand } from "@/components/payments/payment-brand";
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
                        "Payment received. Confirmation will complete shortly. Return to the app.",
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

    const iconWrap =
        state === "success"
            ? paymentBrand.successIconWrap
            : state === "failed"
              ? paymentBrand.errorIconWrap
              : state === "pending"
                ? paymentBrand.pendingIconWrap
                : "mx-auto flex size-14 items-center justify-center rounded-full bg-[#322A3D] text-[#A39DAD]";

    const Icon =
        state === "success"
            ? Check
            : state === "failed"
              ? AlertCircle
              : Loader2;

    return (
        <div className="space-y-6 text-center">
            <div className={iconWrap}>
                <Icon
                    className={state === "loading" ? "size-7 animate-spin" : "size-7"}
                    strokeWidth={2.5}
                    aria-hidden
                />
            </div>

            <div className="space-y-2">
                <h1 className={paymentBrand.display}>{title}</h1>
                {state === "loading" ? (
                    <p className={paymentBrand.body}>Please wait a moment.</p>
                ) : (
                    <p className={paymentBrand.body}>{message}</p>
                )}
            </div>

            <Button asChild className={paymentBrand.primaryButton}>
                <a href={deepLink}>Return to StrathSpace</a>
            </Button>

            <p className={paymentBrand.caption}>
                If the app does not open, switch back to StrathSpace manually.
            </p>

            <Link href={appReturnUrl} className={paymentBrand.inlineLink}>
                Open app link
            </Link>
        </div>
    );
}
