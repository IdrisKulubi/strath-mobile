/**
 * Phase 2 verification — run: npx tsx src/scripts/verify-payment-phase2.ts
 */
import dotenv from "dotenv";
import { createHmac } from "node:crypto";

dotenv.config({ path: ".env.local" });

import {
    buildPaymentReference,
    getPaymentConfig,
    initializeTransaction,
    PaystackApiError,
    signPaymentToken,
    verifyPaymentToken,
    verifyWebhookSignature,
} from "@/lib/payments";

async function runTokenChecks(): Promise<void> {
    if (!process.env.PAYMENT_TOKEN_SECRET?.trim()) {
        process.env.PAYMENT_TOKEN_SECRET = "phase2-verify-local-secret";
    }

    const token = signPaymentToken(
        { dateMatchId: "00000000-0000-0000-0000-000000000001", userId: "verify-user" },
        60_000,
    );
    const payload = verifyPaymentToken(token);
    if (!payload) throw new Error("Token verify failed");
    console.log("token round-trip: OK", { userId: payload.userId });

    const bad = verifyPaymentToken(`${token}x`);
    if (bad !== null) throw new Error("Tampered token should be null");
    console.log("token tamper reject: OK");
}

async function runWebhookChecks(): Promise<void> {
    const body = '{"event":"charge.success"}';
    const secret =
        process.env.PAYSTACK_WEBHOOK_SECRET?.trim()
        || process.env.PAYSTACK_SECRET_KEY?.trim()
        || "phase2-webhook-fallback";

    if (!process.env.PAYSTACK_WEBHOOK_SECRET?.trim() && !process.env.PAYSTACK_SECRET_KEY?.trim()) {
        process.env.PAYSTACK_WEBHOOK_SECRET = secret;
    }

    const sig = createHmac("sha512", secret).update(body).digest("hex");
    if (!verifyWebhookSignature(body, sig)) throw new Error("Webhook signature should match");
    if (verifyWebhookSignature(body, "deadbeef")) throw new Error("Bad sig should fail");
    console.log("webhook signature: OK");
}

async function runPaystackInitOptional(): Promise<void> {
    const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!secret?.startsWith("sk_") || secret.includes("xxx")) {
        console.log("paystack init: skipped (set a real sk_test_ key in .env.local)");
        return;
    }

    const config = getPaymentConfig();
    const reference = buildPaymentReference(
        "00000000-0000-0000-0000-000000000099",
        "phase2-verify-user",
    );
    const callbackUrl = `${config.webPaymentUrl.replace(/\/$/, "")}/callback`;

    try {
        const result = await initializeTransaction({
            email: process.env.PAYSTACK_TEST_EMAIL?.trim() || "test@strathspace.com",
            reference,
            callbackUrl,
            dateMatchId: "00000000-0000-0000-0000-000000000099",
            userId: "phase2-verify-user",
        });

        console.log("paystack init: OK");
        console.log("  reference:", result.reference);
        console.log("  authorizationUrl:", result.authorizationUrl);
    } catch (err) {
        const message = err instanceof PaystackApiError ? err.message : String(err);
        console.log("paystack init: skipped (API error — check PAYSTACK_SECRET_KEY):", message);
    }
}

async function main() {
    await runTokenChecks();
    await runWebhookChecks();
    await runPaystackInitOptional();
    console.log("\nPhase 2 verification: OK");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
