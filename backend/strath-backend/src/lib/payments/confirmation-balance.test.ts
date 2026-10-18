import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    CONFIRMATION_PACK_PURCHASE_REASON,
    countBalanceFromRows,
    isConfirmationCreditReason,
} from "@/lib/payments/confirmation-balance";

describe("confirmation-balance pure helpers", () => {
    it("countBalanceFromRows groups active and reserved", () => {
        assert.deepEqual(
            countBalanceFromRows([
                { status: "active" },
                { status: "active" },
                { status: "reserved" },
            ]),
            { available: 2, reserved: 1, total: 3 },
        );
    });

    it("countBalanceFromRows ignores spent rows", () => {
        assert.deepEqual(countBalanceFromRows([{ status: "spent" }]), {
            available: 0,
            reserved: 0,
            total: 0,
        });
    });

    it("isConfirmationCreditReason recognizes pack reasons", () => {
        assert.equal(isConfirmationCreditReason(CONFIRMATION_PACK_PURCHASE_REASON), true);
        assert.equal(isConfirmationCreditReason("partner_did_not_pay"), false);
    });
});
