import test from "node:test";
import assert from "node:assert/strict";

import {
    generateMatchmakerCandidateIntro,
    generateMatchmakerFeedbackReply,
    generateMatchmakerGreeting,
    generateMatchmakerLimitReply,
    generateMatchmakerLlmTurn,
    generateMatchmakerSearchStatusReply,
} from "@/lib/services/matchmaker-llm-client";

test("scripted voice fallbacks cover every user-facing matchmaker turn", async () => {
    process.env.MATCHMAKER_LLM_PROVIDER = "scripted";

    const [greeting, candidate, feedback, limit, noResult] = await Promise.all([
        generateMatchmakerGreeting({ firstName: "Idris" }),
        generateMatchmakerCandidateIntro({
            firstName: "Maya",
            labels: ["Active recently", "Calm"],
            matchReason: "Calm and active recently.",
        }),
        generateMatchmakerFeedbackReply({
            outcome: "not_this_one",
            reason: "Too social",
        }),
        generateMatchmakerLimitReply({ used: 3, limit: 3 }),
        generateMatchmakerSearchStatusReply({
            status: "no_result",
            intentText: "calm and intentional",
        }),
    ]);

    assert.match(greeting.text, /Idris/);
    assert.match(candidate.text, /Maya/);
    assert.match(feedback.text, /too social/i);
    assert.match(limit.text, /tomorrow/i);
    assert.match(noResult.text, /weak match/i);
    assert.deepEqual(
        [greeting, candidate, feedback, limit, noResult].map((reply) => reply.provider),
        ["scripted", "scripted", "scripted", "scripted", "scripted"],
    );
});

test("clarifier answer advances to a search plan instead of repeating the same question", async () => {
    process.env.MATCHMAKER_LLM_PROVIDER = "scripted";

    const turn = await generateMatchmakerLlmTurn({
        userMessage: "Emotionally mature",
        state: "clarifying",
        currentIntent: {
            rawText: "I want someone calm",
            traits: ["calm"],
            activityRequirement: "any",
            relationshipIntent: "unknown",
            socialEnergy: "quiet",
        },
        recentMessages: [
            {
                role: "assistant",
                text: "When you say that, what matters most: emotional maturity, a quiet personality, or someone low-drama and consistent?",
            },
        ],
    });

    assert.equal(turn.shouldClarify, false);
    assert.equal(turn.messageType, "search_plan");
    assert.equal(turn.clarifyingQuestion, null);
    assert.ok(turn.reply.includes("Should I go ahead?"));
    assert.deepEqual(turn.quickReplies, [
        "Go ahead and search",
        "Change something",
        "Make it more serious",
        "Show someone active",
    ]);
    assert.ok(turn.intent.traits.includes("emotionally_mature"));
    assert.ok(turn.searchPlan.priorities.includes("emotional maturity"));
});

test("clarifier answer advances even when the stored state is stale", async () => {
    process.env.MATCHMAKER_LLM_PROVIDER = "scripted";

    const turn = await generateMatchmakerLlmTurn({
        userMessage: "Low-drama and consistent",
        state: "collecting_intent",
        currentIntent: {
            rawText: "I want someone cool and nice",
            traits: [],
            activityRequirement: "any",
            relationshipIntent: "unknown",
            socialEnergy: "unknown",
        },
        recentMessages: [
            {
                role: "assistant",
                text: "When you say that, what matters most: emotional maturity, a quiet personality, or someone low-drama and consistent?",
            },
        ],
    });

    assert.equal(turn.shouldClarify, false);
    assert.equal(turn.messageType, "search_plan");
    assert.ok(turn.intent.traits.includes("low_drama"));
    assert.ok(turn.searchPlan.priorities.includes("low-drama profile signals"));
});
