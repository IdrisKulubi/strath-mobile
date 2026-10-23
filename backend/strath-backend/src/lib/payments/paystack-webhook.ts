import { createHmac, timingSafeEqual } from "node:crypto";

import { getWebhookSigningSecret } from "@/lib/payments/config";

function safeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
        return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
    } catch {
        return false;
    }
}

/** Verify Paystack `x-paystack-signature` (HMAC-SHA512 of raw body). */
export function verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null | undefined,
): boolean {
    if (!signatureHeader?.trim()) return false;

    const hash = createHmac("sha512", getWebhookSigningSecret())
        .update(rawBody)
        .digest("hex");

    return safeEqualHex(hash, signatureHeader.trim());
}
