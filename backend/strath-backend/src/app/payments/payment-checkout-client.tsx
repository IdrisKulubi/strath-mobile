"use client";

import Link from "next/link";
import { Calendar, Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { paymentBrand } from "@/components/payments/payment-brand";
import { PaymentWebCard } from "@/components/payments/payment-web-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const INCLUDES = [
    "Date coordination by StrathSpace",
    "Confirmation with both people",
    "Venue and time scheduling",
    "Pre-date support",
] as const;

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
                <div className={paymentBrand.successIconWrap}>
                    <Check className="size-7" strokeWidth={2.5} aria-hidden />
                </div>
                <div className="space-y-2">
                    <h1 className={paymentBrand.display}>You&apos;re confirmed</h1>
                    <p className={paymentBrand.body}>
                        Waiting for {props.partnerFirstName} to confirm their Date Setup Fee.
                    </p>
                </div>
                <Button asChild className={paymentBrand.primaryButton}>
                    <a href={props.appReturnUrl}>Return to StrathSpace</a>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="space-y-2 text-center">
                <p className={paymentBrand.label}>Date setup fee</p>
                <h1 className={paymentBrand.display}>Confirm your date</h1>
                <p className={paymentBrand.body}>
                    A one-time fee helps us coordinate your date with {props.partnerFirstName} and
                    keep StrathSpace intentional. This is not a subscription.
                </p>
            </header>

            <PaymentWebCard className="space-y-6">
                <p className={paymentBrand.amount}>{amountLabel}</p>
                {props.scheduledAtLabel ? (
                    <p className="flex items-center justify-center gap-2 text-sm text-[#A39DAD]">
                        <Calendar className="size-4 shrink-0 text-[#D94A8F]" aria-hidden />
                        <span>Proposed time: {props.scheduledAtLabel}</span>
                    </p>
                ) : null}
                <ul className="space-y-2.5 border-t border-[#322A3D] pt-5">
                    {INCLUDES.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                            <Check
                                className="mt-0.5 size-4 shrink-0 text-[#3DB87A]"
                                strokeWidth={2.5}
                                aria-hidden
                            />
                            <span className={paymentBrand.listItem}>{item}</span>
                        </li>
                    ))}
                </ul>
            </PaymentWebCard>

            {props.blockReason ? (
                <p className={paymentBrand.warningBanner} role="alert">
                    {props.blockReason}
                </p>
            ) : null}

            {error ? (
                <p className={paymentBrand.errorBanner} role="alert">
                    {error}
                </p>
            ) : null}

            <Button
                type="button"
                className={cn(paymentBrand.primaryButton, "shadow-none")}
                disabled={!props.canPay || loading}
                onClick={handlePay}
            >
                {loading ? (
                    <>
                        <Loader2 className="size-5 animate-spin" aria-hidden />
                        Starting checkout…
                    </>
                ) : (
                    `Pay ${amountLabel} to confirm`
                )}
            </Button>

            <p className={paymentBrand.caption}>
                <span className="block text-center">
                    By paying, you agree to StrathSpace&apos;s{" "}
                    <Link href="/terms" className={paymentBrand.inlineLink}>
                        Terms of Service
                    </Link>
                    .
                </span>
            </p>
        </div>
    );
}
