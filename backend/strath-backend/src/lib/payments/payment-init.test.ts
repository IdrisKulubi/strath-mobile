import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { buildDateMatchPaymentInsert } from "@/lib/payments/payment-init";

const confirmBy = new Date("2026-06-05T10:00:00.000Z");

before(() => {
    process.env.DATE_CONFIRMATION_AMOUNT_CENTS = "49900";
});

describe("buildDateMatchPaymentInsert", () => {
    it("returns not_required when payments are disabled", () => {
        const fields = buildDateMatchPaymentInsert({ confirmBy, enabled: false });
        assert.equal(fields.paymentState, "not_required");
        assert.equal(fields.paymentDueBy, undefined);
    });

    it("returns awaiting_payment with deadline when enabled", () => {
        const fields = buildDateMatchPaymentInsert({ confirmBy, enabled: true });
        assert.equal(fields.paymentState, "awaiting_payment");
        assert.equal(fields.paymentDueBy?.toISOString(), confirmBy.toISOString());
        assert.equal(fields.paymentAmountCents, 49900);
        assert.equal(fields.paymentCurrency, "KES");
    });
});
