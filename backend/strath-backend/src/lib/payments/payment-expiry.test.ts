import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    findSinglePaidPayer,
    isPaymentDueExpired,
} from "@/lib/payments/payment-expiry";

describe("payment-expiry helpers", () => {
    it("isPaymentDueExpired is true when due by is in the past", () => {
        const past = new Date(Date.now() - 60_000);
        assert.equal(isPaymentDueExpired(past), true);
        assert.equal(isPaymentDueExpired(new Date(Date.now() + 60_000)), false);
        assert.equal(isPaymentDueExpired(null), false);
    });

    it("findSinglePaidPayer returns payer only when exactly one paid row", () => {
        assert.equal(
            findSinglePaidPayer([
                { userId: "a", status: "paid" },
                { userId: "b", status: "pending" },
            ])?.payerUserId,
            "a",
        );
        assert.equal(findSinglePaidPayer([]), null);
        assert.equal(
            findSinglePaidPayer([
                { userId: "a", status: "paid" },
                { userId: "b", status: "paid" },
            ]),
            null,
        );
        assert.equal(
            findSinglePaidPayer([
                { userId: "a", status: "pending" },
                { userId: "b", status: "pending" },
            ]),
            null,
        );
    });
});
