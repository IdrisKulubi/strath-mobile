import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NOTIFICATION_TYPES } from "@/lib/notification-types";

/** Mirrors strath-mobile/lib/services/notifications-service.ts — keep in sync (phase 11). */
const MOBILE_PAYMENT_NOTIFICATION_TYPES = {
    PAYMENT_REQUIRED: "payment_required",
    PAYMENT_PARTNER_PAID: "payment_partner_paid",
    PAYMENT_BOTH_PAID: "payment_both_paid",
    PAYMENT_EXPIRING: "payment_expiring",
    PAYMENT_EXPIRED: "payment_expired",
    CREDIT_GRANTED: "credit_granted",
    REFUND_COMPLETED: "refund_completed",
} as const;

describe("payment push notification types", () => {
    it("matches mobile notification type strings", () => {
        for (const key of Object.keys(MOBILE_PAYMENT_NOTIFICATION_TYPES) as Array<
            keyof typeof MOBILE_PAYMENT_NOTIFICATION_TYPES
        >) {
            assert.equal(NOTIFICATION_TYPES[key], MOBILE_PAYMENT_NOTIFICATION_TYPES[key]);
        }
    });
});
