import { createHmac, timingSafeEqual } from "node:crypto";

import { getPaymentConfig, getPaymentTokenSecret } from "@/lib/payments/config";
import type { PaymentTokenPayload } from "@/lib/payments/types";

function signBody(body: string, secret: string): string {
    return createHmac("sha256", secret).update(body).digest("base64url");
}

function safeEqualBase64Url(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
        return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
        return false;
    }
}

export function signPaymentToken(
    payload: Omit<PaymentTokenPayload, "exp">,
    ttlMs?: number,
): string {
    const secret = getPaymentTokenSecret();
    const ttl = ttlMs ?? getPaymentConfig().tokenTtlMs;
    const full: PaymentTokenPayload = { ...payload, exp: Date.now() + ttl };
    const body = Buffer.from(JSON.stringify(full)).toString("base64url");
    const sig = signBody(body, secret);
    return `${body}.${sig}`;
}

export function verifyPaymentToken(token: string): PaymentTokenPayload | null {
    try {
        const secret = getPaymentTokenSecret();
        const [body, sig] = token.split(".");
        if (!body || !sig) return null;

        const expected = signBody(body, secret);
        if (!safeEqualBase64Url(sig, expected)) return null;

        const payload = JSON.parse(
            Buffer.from(body, "base64url").toString("utf8"),
        ) as PaymentTokenPayload;

        if (
            typeof payload.dateMatchId !== "string"
            || typeof payload.userId !== "string"
            || typeof payload.exp !== "number"
        ) {
            return null;
        }

        if (payload.exp < Date.now()) return null;

        return payload;
    } catch {
        return null;
    }
}
