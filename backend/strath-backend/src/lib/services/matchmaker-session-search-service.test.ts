import assert from "node:assert/strict";
import test from "node:test";

import {
    buildMatchmakerShortlistRequestKey,
    curateUniqueShortlist,
} from "@/lib/services/matchmaker-session-search-service";

test("curateUniqueShortlist preserves rank order, removes repeats, and caps at three", () => {
    const candidates = ["first", "repeat", "repeat", "excluded", "third", "fourth"]
        .map((candidateUserId, index) => ({ candidateUserId, rank: index }));
    const shortlist = curateUniqueShortlist(candidates, ["excluded"]);
    assert.deepEqual(shortlist.map((candidate) => candidate.candidateUserId), ["first", "repeat", "third"]);
    assert.deepEqual(shortlist.map((candidate) => candidate.rank), [0, 1, 4]);
});

test("shortlist request key is stable across retries of the same credit and brief", () => {
    const input = { sessionId: "session", dailySearchCount: 1, briefVersion: 7 };
    assert.equal(buildMatchmakerShortlistRequestKey(input), buildMatchmakerShortlistRequestKey(input));
    assert.notEqual(buildMatchmakerShortlistRequestKey(input), buildMatchmakerShortlistRequestKey({ ...input, dailySearchCount: 2 }));
});
