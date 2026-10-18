import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
    canChooseRefundForMatch,
    canUseCreditForMatch,
} from "@/lib/payments/payment-credit";

before(() => {
    process.env.DATE_CONFIRMATION_AMOUNT_CENTS = "49900";
});

describe("payment-credit eligibility", () => {
    it("canUseCreditForMatch when balance and state allow", () => {
        assert.equal(
            canUseCreditForMatch({
                paymentState: "awaiting_payment",
                paymentDueBy: new Date(Date.now() + 60_000),
                currentUserPaid: false,
                creditBalanceCents: 49900,
                amountCents: 49900,
            }),
            true,
        );
    });

    it("canUseCreditForMatch rejects insufficient balance", () => {
        assert.equal(
            canUseCreditForMatch({
                paymentState: "awaiting_payment",
                paymentDueBy: new Date(Date.now() + 60_000),
                currentUserPaid: false,
                creditBalanceCents: 100,
                amountCents: 49900,
            }),
            false,
        );
    });

    it("canChooseRefundForMatch only for expired credited payments", () => {
        assert.equal(
            canChooseRefundForMatch({
                paymentState: "expired",
                userPaymentStatus: "credited",
            }),
            true,
        );
        assert.equal(
            canChooseRefundForMatch({
                paymentState: "awaiting_payment",
                userPaymentStatus: "credited",
            }),
            false,
        );
        assert.equal(
            canChooseRefundForMatch({
                paymentState: "expired",
                userPaymentStatus: "refunded",
            }),
            false,
        );
    });
});
