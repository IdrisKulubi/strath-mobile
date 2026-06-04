import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";

import { signPaymentToken, verifyPaymentToken } from "@/lib/payments/payment-token";

const ORIGINAL_SECRET = process.env.PAYMENT_TOKEN_SECRET;

before(() => {
    process.env.PAYMENT_TOKEN_SECRET = "test-payment-token-secret-phase2";
});

afterEach(() => {
    process.env.PAYMENT_TOKEN_SECRET = "test-payment-token-secret-phase2";
});

describe("payment-token", () => {
    it("signs and verifies a valid token", () => {
        const token = signPaymentToken(
            { dateMatchId: "dm-11111111-1111-1111-1111-111111111111", userId: "user-a" },
            60_000,
        );
        const payload = verifyPaymentToken(token);
        assert.ok(payload);
        assert.equal(payload.userId, "user-a");
        assert.equal(payload.dateMatchId, "dm-11111111-1111-1111-1111-111111111111");
        assert.ok(payload.exp > Date.now());
    });

    it("rejects a tampered token", () => {
        const token = signPaymentToken(
            { dateMatchId: "dm-1", userId: "u1" },
            60_000,
        );
        const tampered = `${token.slice(0, -1)}x`;
        assert.equal(verifyPaymentToken(tampered), null);
    });

    it("rejects an expired token", async () => {
        const token = signPaymentToken({ dateMatchId: "dm-1", userId: "u1" }, 50);
        await new Promise((resolve) => setTimeout(resolve, 80));
        assert.equal(verifyPaymentToken(token), null);
    });

    it("rejects malformed tokens", () => {
        assert.equal(verifyPaymentToken(""), null);
        assert.equal(verifyPaymentToken("not-a-jwt"), null);
        assert.equal(verifyPaymentToken("bodyonly"), null);
    });
});
