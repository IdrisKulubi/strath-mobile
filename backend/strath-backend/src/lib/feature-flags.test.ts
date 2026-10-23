import test from "node:test";
import assert from "node:assert/strict";

import {
    DEFAULT_MATCHMAKER_DAILY_SEARCH_LIMIT,
    isUserInMatchmakerV2Rollout,
    parseMatchmakerV2RolloutConfig,
    stableRolloutBucket,
} from "@/lib/feature-flags";

test("matchmaker rollout accepts only locked stages and fails closed for invalid config", () => {
    assert.equal(parseMatchmakerV2RolloutConfig({ percentage: 25 }).percentage, 25);
    assert.equal(parseMatchmakerV2RolloutConfig({ percentage: 30 }).percentage, 0);
    assert.equal(parseMatchmakerV2RolloutConfig({}).percentage, 100);
    assert.equal(parseMatchmakerV2RolloutConfig({ dailySearchLimit: 4 }).dailySearchLimit, 4);
    assert.equal(parseMatchmakerV2RolloutConfig({ dailySearchLimit: 0 }).dailySearchLimit, DEFAULT_MATCHMAKER_DAILY_SEARCH_LIMIT);
    assert.equal(parseMatchmakerV2RolloutConfig({ dailySearchLimit: 11 }).dailySearchLimit, DEFAULT_MATCHMAKER_DAILY_SEARCH_LIMIT);
});

test("rollout assignment is deterministic and the master switch always wins", () => {
    assert.equal(stableRolloutBucket("user-a"), stableRolloutBucket("user-a"));
    const config = parseMatchmakerV2RolloutConfig({ percentage: 100, internalUserIds: ["internal"] });
    assert.equal(isUserInMatchmakerV2Rollout({ masterEnabled: false, config, userId: "internal" }), false);
    assert.equal(isUserInMatchmakerV2Rollout({ masterEnabled: true, config, userId: "student" }), true);
});

test("anonymous clients see V2 only at full rollout while internal users can test stage zero", () => {
    const config = parseMatchmakerV2RolloutConfig({ percentage: 0, internalUserIds: ["internal"], rollbackReady: true });
    assert.equal(isUserInMatchmakerV2Rollout({ masterEnabled: true, config }), false);
    assert.equal(isUserInMatchmakerV2Rollout({ masterEnabled: true, config, userId: "internal" }), true);
    assert.equal(config.rollbackReady, true);
    assert.equal(config.stageStartedAt, null);
});
