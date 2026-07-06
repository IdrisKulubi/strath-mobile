import test from "node:test";
import assert from "node:assert/strict";

import { generateMatchmakerLlmTurn } from "@/lib/services/matchmaker-llm-client";

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
