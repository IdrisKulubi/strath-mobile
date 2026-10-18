import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { dateMatches, datePayments } from "@/db/schema";
import { assessPaymentSessionPayability } from "@/lib/payments/payment-payability";

type DateMatchRow = typeof dateMatches.$inferSelect;
type DatePaymentRow = typeof datePayments.$inferSelect;

function baseMatch(overrides: Partial<DateMatchRow> = {}): DateMatchRow {
    return {
        id: "00000000-0000-0000-0000-000000000001",
        requestId: null,
        candidatePairId: null,
        userAId: "user-a",
        userBId: "user-b",
        vibe: "coffee",
        callCompleted: false,
        userAConfirmed: false,
        userBConfirmed: false,
        status: "pending_setup",
        locationId: null,
        venueName: null,
        venueAddress: null,
        scheduledAt: null,
        paymentState: "awaiting_payment",
        paymentDueBy: new Date(Date.now() + 60_000),
        paymentAmountCents: 49900,
        paymentCurrency: "KES",
        paidUserCount: 0,
        createdAt: new Date(),
        ...overrides,
    } as DateMatchRow;
}

describe("assessPaymentSessionPayability", () => {
    it("allows eligible awaiting_payment match", () => {
        const result = assessPaymentSessionPayability({
            dateMatch: baseMatch(),
            userId: "user-a",
            paymentsEnabled: true,
            userPayment: null,
        });
        assert.equal(result.eligible, true);
    });

    it("rejects when payments flag is off", () => {
        const result = assessPaymentSessionPayability({
            dateMatch: baseMatch(),
            userId: "user-a",
            paymentsEnabled: false,
            userPayment: null,
        });
        assert.equal(result.eligible, false);
        if (!result.eligible) assert.equal(result.code, "payments_disabled");
    });

    it("rejects already paid user", () => {
        const result = assessPaymentSessionPayability({
            dateMatch: baseMatch(),
            userId: "user-a",
            paymentsEnabled: true,
            userPayment: {
                status: "paid",
            } as DatePaymentRow,
        });
        assert.equal(result.eligible, false);
        if (!result.eligible) assert.equal(result.code, "already_paid");
    });

    it("rejects expired payment window", () => {
        const result = assessPaymentSessionPayability({
            dateMatch: baseMatch({
                paymentDueBy: new Date(Date.now() - 1000),
            }),
            userId: "user-a",
            paymentsEnabled: true,
            userPayment: null,
        });
        assert.equal(result.eligible, false);
        if (!result.eligible) assert.equal(result.code, "payment_expired");
    });

    it("allows not_required only with dev force", () => {
        const withoutForce = assessPaymentSessionPayability({
            dateMatch: baseMatch({ paymentState: "not_required" }),
            userId: "user-a",
            paymentsEnabled: true,
            userPayment: null,
        });
        assert.equal(withoutForce.eligible, false);

        const withForce = assessPaymentSessionPayability({
            dateMatch: baseMatch({ paymentState: "not_required" }),
            userId: "user-a",
            paymentsEnabled: true,
            userPayment: null,
            devForcePayability: true,
        });
        assert.equal(withForce.eligible, true);
    });
});
