import assert from "node:assert/strict";
import test from "node:test";

import { applyShortlistAvailability, removeShortlistCandidates, shortlistCandidateIds } from "@/lib/matchmaker/shortlist-availability";

const messages = [{
    metadata: {
        candidate: { candidateUserId: "first", reason: "x" },
        shortlist: {
            id: "shortlist",
            candidates: [
                { candidateUserId: "first", reason: "x" },
                { candidateUserId: "second", reason: "y" },
            ],
        },
    },
}];

test("marks only newly unavailable candidates and preserves the rest of the shortlist", () => {
    assert.deepEqual(shortlistCandidateIds(messages), ["first", "second"]);
    const result = applyShortlistAvailability(messages, new Set(["first"]));
    const shortlist = result.messages[0].metadata.shortlist as unknown as { candidates: { availability: string }[] };
    assert.deepEqual(shortlist.candidates.map((candidate) => candidate.availability), ["unavailable", "available"]);
    assert.deepEqual(result.staleShortlistIds, ["shortlist"]);
});

test("removes a passed candidate from the shortlist and fallback candidate", () => {
    const [updated] = removeShortlistCandidates(messages, new Set(["first"]));
    const shortlist = updated.metadata.shortlist as unknown as { candidates: { candidateUserId: string }[] };
    assert.deepEqual(shortlist.candidates.map((candidate) => candidate.candidateUserId), ["second"]);
    assert.equal(updated.metadata.candidate, undefined);
});
