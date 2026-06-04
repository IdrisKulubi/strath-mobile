import Link from "next/link";
import type { ReactNode } from "react";

import { paymentBrand } from "@/components/payments/payment-brand";
import { cn } from "@/lib/utils";

export function PaymentWebShell({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={paymentBrand.page}>
            <div className={cn(paymentBrand.shell, className)}>
                <Link href="/" className={paymentBrand.logo}>
                    StrathSpace
                </Link>
                {children}
            </div>
        </div>
    );
}

export function PaymentWebCard({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <div className={cn(paymentBrand.card, className)}>{children}</div>;
}

export function PaymentInvalidState({ message }: { message: string }) {
    return (
        <div className="space-y-4 text-center">
            <h1 className={paymentBrand.title}>Link unavailable</h1>
            <p className={paymentBrand.body}>{message}</p>
        </div>
    );
}
