import test from "node:test";
import assert from "node:assert/strict";
import { NOTIFICATION_TYPES as backendTypes } from "@/lib/notification-types";

/** Keep in sync with strath-mobile/lib/services/notifications-service.ts */
const MOBILE_RESCHEDULE_TYPES = {
    MEETUP_RESCHEDULE_REQUESTED: "meetup_reschedule_requested",
    MEETUP_RESCHEDULE_COUNTERED: "meetup_reschedule_countered",
    MEETUP_RESCHEDULE_ACCEPTED: "meetup_reschedule_accepted",
    MEETUP_RESCHEDULE_CANCELLED: "meetup_reschedule_cancelled",
} as const;

test("reschedule notification types match mobile constants", () => {
    assert.equal(
        backendTypes.MEETUP_RESCHEDULE_REQUESTED,
        MOBILE_RESCHEDULE_TYPES.MEETUP_RESCHEDULE_REQUESTED,
    );
    assert.equal(
        backendTypes.MEETUP_RESCHEDULE_COUNTERED,
        MOBILE_RESCHEDULE_TYPES.MEETUP_RESCHEDULE_COUNTERED,
    );
    assert.equal(
        backendTypes.MEETUP_RESCHEDULE_ACCEPTED,
        MOBILE_RESCHEDULE_TYPES.MEETUP_RESCHEDULE_ACCEPTED,
    );
    assert.equal(
        backendTypes.MEETUP_RESCHEDULE_CANCELLED,
        MOBILE_RESCHEDULE_TYPES.MEETUP_RESCHEDULE_CANCELLED,
    );
});
