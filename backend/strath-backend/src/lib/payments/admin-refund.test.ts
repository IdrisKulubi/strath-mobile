import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("admin-refund module", () => {
    it("exports adminRequestRefundForPayment", async () => {
        const mod = await import("@/lib/payments/admin-refund");
        assert.equal(typeof mod.adminRequestRefundForPayment, "function");
    });
});
