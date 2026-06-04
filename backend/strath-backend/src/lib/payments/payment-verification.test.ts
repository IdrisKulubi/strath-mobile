import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import type { DatePayment } from "@/db/schema";
import { validatePaystackVerification } from "@/lib/payments/payment-verification";

const basePayment: DatePayment = {
    id: "pay-1",
    dateMatchId: "match-1",
    userId: "user-a",
    amountCents: 49900,
    currency: "KES",
    provider: "paystack",
    paystackReference: "strath_date_ref_1",
    paystackTransactionId: null,
    status: "pending",
    paidAt: null,
    refundedAt: null,
    creditedAt: null,
    refundReason: null,
    rawVerifyPayload: null,
    rawWebhookPayload: null,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const validVerified = {
    status: "success" as const,
    amount: 49900,
    currency: "KES",
    reference: "strath_date_ref_1",
    transactionId: 12345,
    metadata: {
        dateMatchId: "match-1",
        userId: "user-a",
        reference: "strath_date_ref_1",
    },
};

before(() => {
    process.env.DATE_CONFIRMATION_AMOUNT_CENTS = "49900";
});

describe("validatePaystackVerification", () => {
    it("accepts a valid verification", () => {
        const result = validatePaystackVerification(basePayment, validVerified);
        assert.equal(result.ok, true);
    });

    it("rejects non-success status", () => {
        const result = validatePaystackVerification(basePayment, {
            ...validVerified,
            status: "failed",
        });
        assert.equal(result.ok, false);
        if (!result.ok) assert.equal(result.reason, "transaction_not_successful");
    });

    it("rejects amount mismatch", () => {
        const result = validatePaystackVerification(basePayment, {
            ...validVerified,
            amount: 100,
        });
        assert.equal(result.ok, false);
        if (!result.ok) assert.equal(result.reason, "amount_mismatch");
    });

    it("rejects metadata mismatch", () => {
        const result = validatePaystackVerification(basePayment, {
            ...validVerified,
            metadata: { dateMatchId: "other", userId: "user-a" },
        });
        assert.equal(result.ok, false);
        if (!result.ok) assert.equal(result.reason, "metadata_mismatch");
    });
});
