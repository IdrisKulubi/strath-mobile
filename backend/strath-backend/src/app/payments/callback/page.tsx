import type { Metadata } from "next";

import { PaymentCallbackClient } from "@/app/payments/callback/payment-callback-client";
import { getPaymentConfig } from "@/lib/payments/config";

export const metadata: Metadata = {
    title: "Payment status — StrathSpace",
    robots: { index: false, follow: false },
};

interface PaymentCallbackPageProps {
    searchParams: Promise<{ reference?: string; trxref?: string }>;
}

export default async function PaymentCallbackPage({ searchParams }: PaymentCallbackPageProps) {
    const params = await searchParams;
    const reference = params.reference?.trim() || params.trxref?.trim() || null;
    return (
        <div className="min-h-dvh bg-zinc-950 text-zinc-200 antialiased">
            <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
                <PaymentCallbackClient
                    reference={reference}
                    appReturnUrl={getPaymentConfig().appReturnUrl}
                />
            </div>
        </div>
    );
}
