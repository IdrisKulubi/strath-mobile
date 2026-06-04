import type { Metadata } from "next";

import { PaymentCheckoutClient } from "@/app/payments/payment-checkout-client";
import { PaymentInvalidState, PaymentWebShell } from "@/components/payments/payment-web-shell";
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
            <PaymentWebShell>
                <PaymentInvalidState message="This payment link is missing or incomplete. Open it again from the StrathSpace app." />
            </PaymentWebShell>
        );
    }

    const context = await getPaymentCheckoutContext(token.trim());

    if (context.status === "invalid") {
        return (
            <PaymentWebShell>
                <PaymentInvalidState message="This payment link has expired or is invalid. Reopen checkout from the StrathSpace app." />
            </PaymentWebShell>
        );
    }

    return (
        <PaymentWebShell>
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
        </PaymentWebShell>
    );
}
