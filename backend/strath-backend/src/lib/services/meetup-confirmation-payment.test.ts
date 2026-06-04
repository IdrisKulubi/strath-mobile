import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    shouldBlockFinalizeForPayment,
    shouldRequirePaymentToConfirm,
} from "@/lib/services/meetup-confirmation-payment";

describe("meetup-confirmation-payment", () => {
    it("shouldBlockFinalizeForPayment only when flag on and not both_paid", () => {
        assert.equal(
            shouldBlockFinalizeForPayment({ paymentsEnabled: false, paymentState: "awaiting_payment" }),
            false,
        );
        assert.equal(
            shouldBlockFinalizeForPayment({ paymentsEnabled: true, paymentState: "paid_waiting_for_other" }),
            true,
        );
        assert.equal(
            shouldBlockFinalizeForPayment({ paymentsEnabled: true, paymentState: "both_paid" }),
            false,
        );
    });

    it("shouldRequirePaymentToConfirm when flag on and user not paid", () => {
        assert.equal(
            shouldRequirePaymentToConfirm({ paymentsEnabled: false, userPaymentStatus: "pending" }),
            false,
        );
        assert.equal(
            shouldRequirePaymentToConfirm({ paymentsEnabled: true, userPaymentStatus: "pending" }),
            true,
        );
        assert.equal(
            shouldRequirePaymentToConfirm({ paymentsEnabled: true, userPaymentStatus: "paid" }),
            false,
        );
    });
});
