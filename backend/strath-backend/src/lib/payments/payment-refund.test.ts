import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractRefundPaymentLookup } from "@/lib/payments/payment-refund";

describe("payment-refund webhook helpers", () => {
    it("extractRefundPaymentLookup reads transaction reference and id", () => {
        const lookup = extractRefundPaymentLookup({
            transaction: {
                reference: "strath_date_abc",
                id: 12345,
            },
            status: "processed",
        });

        assert.equal(lookup.reference, "strath_date_abc");
        assert.equal(lookup.transactionId, "12345");
    });

    it("extractRefundPaymentLookup handles missing transaction", () => {
        const lookup = extractRefundPaymentLookup({});
        assert.equal(lookup.reference, undefined);
        assert.equal(lookup.transactionId, undefined);
    });
});
