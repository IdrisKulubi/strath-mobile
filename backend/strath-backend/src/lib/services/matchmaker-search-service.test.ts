import test from "node:test";
import assert from "node:assert/strict";

import { parseMatchmakerIntent } from "@/lib/services/matchmaker-intent-service";
import {
    buildMatchmakerLabels,
    rankMatchmakerCandidates,
    type MatchmakerCandidateInput,
} from "@/lib/services/matchmaker-search-service";

function candidate(overrides: Partial<MatchmakerCandidateInput>): MatchmakerCandidateInput {
    return {
        candidateUserId: "candidate",
        firstName: "Amina",
        age: 22,
        university: "Strathmore",
        course: "Computer Science",
        profileSummary: "Calm and intentional, likes coffee and quiet study sessions.",
        searchText: "calm intentional serious relationship coffee study",
        textEmbedding: null,
        activityScore: 75,
        responseScore: 72,
        inboundInterestScore: 40,
        mutualConversionScore: 45,
        candidateStrengthScore: 78,
        profileCompletenessScore: 90,
        photoPresentationScore: 75,
        lastSeenAt: new Date("2026-07-03T09:00:00Z"),
        ...overrides,
    };
}

test("rankMatchmakerCandidates favors active relevant candidates", () => {
    const intent = parseMatchmakerIntent("calm serious and active today");
    const results = rankMatchmakerCandidates({
        intent,
        candidates: [
            candidate({
                candidateUserId: "dormant-relevant",
                activityScore: 20,
                responseScore: 90,
                candidateStrengthScore: 90,
            }),
            candidate({
                candidateUserId: "active-relevant",
                activityScore: 96,
                responseScore: 86,
                candidateStrengthScore: 88,
            }),
            candidate({
                candidateUserId: "active-irrelevant",
                searchText: "party outgoing loud",
                profileSummary: "Outgoing and social.",
                activityScore: 96,
            }),
        ],
        limit: 3,
    });

    assert.equal(results[0].candidateUserId, "active-relevant");
    assert.equal(results.some((item) => item.candidateUserId === "dormant-relevant"), false);
});

test("rankMatchmakerCandidates uses semantic embeddings when available", () => {
    const intent = parseMatchmakerIntent("creative music person");
    const results = rankMatchmakerCandidates({
        intent,
        intentEmbedding: [1, 0, 0],
        candidates: [
            candidate({
                candidateUserId: "semantic-fit",
                searchText: "quiet study",
                textEmbedding: [1, 0, 0],
                activityScore: 80,
            }),
            candidate({
                candidateUserId: "semantic-miss",
                searchText: "creative music",
                textEmbedding: [0, 1, 0],
                activityScore: 80,
            }),
        ],
        limit: 2,
    });

    assert.equal(results[0].candidateUserId, "semantic-fit");
});

test("buildMatchmakerLabels returns safe user-facing labels", () => {
    const intent = parseMatchmakerIntent("calm and serious");
    const labels = buildMatchmakerLabels(intent, candidate({
        activityScore: 92,
        responseScore: 80,
        candidateStrengthScore: 85,
    }));

    assert.ok(labels.includes("Active today"));
    assert.ok(labels.includes("Responsive"));
    assert.equal(labels.some((label) => label.toLowerCase().includes("score")), false);
});
