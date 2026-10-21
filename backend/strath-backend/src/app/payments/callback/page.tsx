import type { Metadata } from "next";

import { PaymentCallbackClient } from "@/app/payments/callback/payment-callback-client";
import { PaymentWebShell } from "@/components/payments/payment-web-shell";
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
        <PaymentWebShell>
            <PaymentCallbackClient
                reference={reference}
                appReturnUrl={getPaymentConfig().appReturnUrl}
            />
        </PaymentWebShell>
    );
}
