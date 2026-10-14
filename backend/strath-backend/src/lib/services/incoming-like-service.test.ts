import test from "node:test";
import assert from "node:assert/strict";

import {
    buildIncomingLikeNotification,
    resolveIncomingLikeAction,
} from "@/lib/services/incoming-like-service";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

test("buildIncomingLikeNotification uses StrathSpace copy with first name", () => {
    const notification = buildIncomingLikeNotification("Alex", true);
    assert.equal(notification.title, "Someone chose you");
    assert.equal(notification.body, "Alex chose you on StrathSpace");
    assert.equal(notification.data.type, NOTIFICATION_TYPES.DATE_REQUEST_RECEIVED);
    assert.equal(notification.data.route, "/(tabs)/pulse");
});

test("buildIncomingLikeNotification routes V1 recipients to Home Interested", () => {
    const notification = buildIncomingLikeNotification("Alex", false);
    assert.equal(notification.data.route, "/(tabs)?homeTab=interested");
});

test("buildIncomingLikeNotification falls back when first name is blank", () => {
    const notification = buildIncomingLikeNotification("   ", false);
    assert.equal(notification.body, "Someone chose you on StrathSpace");
});

test("resolveIncomingLikeAction records and notifies on first like", () => {
    const action = resolveIncomingLikeAction({
        hasMatch: false,
        targetAlreadySwipedOnSwiper: false,
        existingSwipeIsLike: false,
        hasExistingSwipe: false,
    });
    assert.equal(action.shouldRecord, true);
    assert.equal(action.shouldNotify, true);
    assert.equal(action.skippedReason, undefined);
});

test("resolveIncomingLikeAction skips when users are already matched", () => {
    const action = resolveIncomingLikeAction({
        hasMatch: true,
        targetAlreadySwipedOnSwiper: false,
        existingSwipeIsLike: false,
        hasExistingSwipe: false,
    });
    assert.equal(action.shouldRecord, false);
    assert.equal(action.shouldNotify, false);
    assert.equal(action.skippedReason, "matched");
});

test("resolveIncomingLikeAction skips when recipient already responded", () => {
    const action = resolveIncomingLikeAction({
        hasMatch: false,
        targetAlreadySwipedOnSwiper: true,
        existingSwipeIsLike: false,
        hasExistingSwipe: false,
    });
    assert.equal(action.shouldRecord, false);
    assert.equal(action.shouldNotify, false);
    assert.equal(action.skippedReason, "already_responded");
});

test("resolveIncomingLikeAction does not double-notify on duplicate like", () => {
    const action = resolveIncomingLikeAction({
        hasMatch: false,
        targetAlreadySwipedOnSwiper: false,
        existingSwipeIsLike: true,
        hasExistingSwipe: true,
    });
    assert.equal(action.shouldRecord, true);
    assert.equal(action.shouldNotify, false);
    assert.equal(action.skippedReason, "duplicate_like");
});

test("resolveIncomingLikeAction notifies when upgrading pass to like", () => {
    const action = resolveIncomingLikeAction({
        hasMatch: false,
        targetAlreadySwipedOnSwiper: false,
        existingSwipeIsLike: false,
        hasExistingSwipe: true,
    });
    assert.equal(action.shouldRecord, true);
    assert.equal(action.shouldNotify, true);
});
