import test from "node:test";
import assert from "node:assert/strict";

import {
    buildProfileIntelligenceAlerts,
    num,
    pct,
} from "@/lib/services/profile-intelligence-admin";

test("pct returns rounded percentage and handles empty denominators", () => {
    assert.equal(pct(3, 8), 37.5);
    assert.equal(pct(0, 0), 0);
});

test("num coerces database aggregate values safely", () => {
    assert.equal(num("12"), 12);
    assert.equal(num(null), 0);
    assert.equal(num("nope", 7), 7);
});

test("buildProfileIntelligenceAlerts marks low coverage as critical", () => {
    const result = buildProfileIntelligenceAlerts({
        coveragePct: 42,
        stalePct: 3,
        failedJobs: 0,
        pendingJobs: 0,
        dormantUsersShown: 0,
        shortlistOverFiveCount: 0,
    });

    assert.equal(result.status, "critical");
    assert.equal(result.alerts[0].severity, "critical");
});

test("buildProfileIntelligenceAlerts flags stale records and shortlist issues", () => {
    const result = buildProfileIntelligenceAlerts({
        coveragePct: 95,
        stalePct: 14,
        failedJobs: 2,
        pendingJobs: 101,
        dormantUsersShown: 3,
        shortlistOverFiveCount: 1,
    });

    assert.equal(result.status, "warning");
    assert.ok(result.alerts.some((alert) => alert.message.includes("stale")));
    assert.ok(result.alerts.some((alert) => alert.message.includes("failed")));
    assert.ok(result.alerts.some((alert) => alert.message.includes("more than five")));
});

test("buildProfileIntelligenceAlerts returns healthy with no alerts", () => {
    const result = buildProfileIntelligenceAlerts({
        coveragePct: 95,
        stalePct: 2,
        failedJobs: 0,
        pendingJobs: 4,
        dormantUsersShown: 0,
        shortlistOverFiveCount: 0,
    });

    assert.equal(result.status, "healthy");
    assert.deepEqual(result.alerts, []);
});
