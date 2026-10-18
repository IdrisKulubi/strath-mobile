import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { before, describe, it } from "node:test";

import { verifyWebhookSignature } from "@/lib/payments/paystack-webhook";

const TEST_SECRET = "test-webhook-secret-phase2";
const SAMPLE_BODY = '{"event":"charge.success","data":{"reference":"strath_date_abc"}}';

function signBody(body: string, secret: string): string {
    return createHmac("sha512", secret).update(body).digest("hex");
}

before(() => {
    process.env.PAYSTACK_WEBHOOK_SECRET = TEST_SECRET;
    process.env.PAYSTACK_SECRET_KEY = "sk_test_fallback_should_not_be_used";
});

describe("paystack-webhook", () => {
    it("accepts a valid signature", () => {
        const sig = signBody(SAMPLE_BODY, TEST_SECRET);
        assert.equal(verifyWebhookSignature(SAMPLE_BODY, sig), true);
    });

    it("rejects a wrong signature", () => {
        assert.equal(verifyWebhookSignature(SAMPLE_BODY, signBody(SAMPLE_BODY, "wrong")), false);
    });

    it("rejects a missing header", () => {
        assert.equal(verifyWebhookSignature(SAMPLE_BODY, null), false);
        assert.equal(verifyWebhookSignature(SAMPLE_BODY, ""), false);
    });
});
