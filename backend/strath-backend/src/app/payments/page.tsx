import type { Metadata } from "next";
import Link from "next/link";

import { PaymentCheckoutClient } from "@/app/payments/payment-checkout-client";
import { getPaymentConfig } from "@/lib/payments/config";
import { getPaymentCheckoutContext } from "@/lib/payments/payment-checkout-service";

export const metadata: Metadata = {
    title: "Confirm your date — StrathSpace",
    description: "Pay the one-time Date Setup Fee to confirm your StrathSpace date",
    robots: { index: false, follow: false },
};

interface PaymentsPageProps {
    searchParams: Promise<{ token?: string }>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
    const { token } = await searchParams;
    const appReturnUrl = getPaymentConfig().appReturnUrl;

    if (!token?.trim()) {
        return (
            <PaymentShell>
                <InvalidLink message="This payment link is missing or incomplete. Open it again from the StrathSpace app." />
            </PaymentShell>
        );
    }

    const context = await getPaymentCheckoutContext(token.trim());

    if (context.status === "invalid") {
        return (
            <PaymentShell>
                <InvalidLink message="This payment link has expired or is invalid. Reopen checkout from the StrathSpace app." />
            </PaymentShell>
        );
    }

    return (
        <PaymentShell>
            <PaymentCheckoutClient
                paymentToken={token.trim()}
                dateMatchId={context.dateMatchId}
                amount={context.amount}
                currency={context.currency}
                partnerFirstName={context.partnerFirstName}
                scheduledAtLabel={context.scheduledAtLabel}
                currentUserPaid={context.currentUserPaid}
                canPay={context.canPay}
                blockReason={context.blockReason}
                appReturnUrl={appReturnUrl}
            />
        </PaymentShell>
    );
}

function PaymentShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh bg-zinc-950 text-zinc-200 antialiased">
            <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 sm:px-8">
                <Link
                    href="/"
                    className="mb-8 text-center text-sm text-white/50 transition-colors hover:text-white"
                >
                    StrathSpace
                </Link>
                {children}
            </div>
        </div>
    );
}

function InvalidLink({ message }: { message: string }) {
    return (
        <div className="space-y-4 text-center">
            <h1 className="text-2xl font-semibold text-white">Link unavailable</h1>
            <p className="text-sm text-zinc-400">{message}</p>
        </div>
    );
}
