import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    shouldBlockFinalizeForPayment,
    shouldRequirePaymentToConfirm,
} from "@/lib/services/meetup-confirmation-payment";

describe("meetup-confirmation-payment", () => {
    it("shouldBlockFinalizeForPayment only when flag on and not both ready", () => {
        assert.equal(
            shouldBlockFinalizeForPayment({ paymentsEnabled: false, paymentState: "awaiting_payment" }),
            false,
        );
        assert.equal(
            shouldBlockFinalizeForPayment({
                paymentsEnabled: true,
                paymentState: "paid_waiting_for_other",
                readyParticipantCount: 1,
            }),
            true,
        );
        assert.equal(
            shouldBlockFinalizeForPayment({
                paymentsEnabled: true,
                paymentState: "both_paid",
                readyParticipantCount: 2,
            }),
            false,
        );
        assert.equal(
            shouldBlockFinalizeForPayment({ paymentsEnabled: true, paymentState: "both_paid" }),
            false,
        );
    });

    it("shouldRequirePaymentToConfirm when flag on and no paid, reserved, or balance", () => {
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
        assert.equal(
            shouldRequirePaymentToConfirm({
                paymentsEnabled: true,
                userPaymentStatus: "pending",
                hasReserved: true,
            }),
            false,
        );
        assert.equal(
            shouldRequirePaymentToConfirm({
                paymentsEnabled: true,
                userPaymentStatus: "pending",
                canUseBalance: true,
            }),
            false,
        );
    });
});
