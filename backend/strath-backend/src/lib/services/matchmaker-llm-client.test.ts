import test from "node:test";
import assert from "node:assert/strict";

import {
    buildClarifiedSearchPlanTurn,
    generateMatchmakerLlmTurn,
    inferStructuredIntent,
    isMatchmakerSearchConfirmation,
    isMatchmakerSearchRefinement,
    MatchmakerLlmUnavailableError,
} from "@/lib/services/matchmaker-llm-client";

test("inferStructuredIntent extracts traits without canned prose", () => {
    const structured = inferStructuredIntent({
        userMessage: "I want someone calm and serious",
        state: "collecting_intent",
    });

    assert.equal(structured.shouldClarify, false);
    assert.ok(structured.intent.traits.includes("calm"));
    assert.ok(structured.intent.traits.includes("serious"));
    assert.ok(structured.searchPlan.priorities.includes("intentional dating signals"));
});

test("buildClarifiedSearchPlanTurn merges clarifier answers without template reply text", () => {
    const merged = buildClarifiedSearchPlanTurn(
        {
            userMessage: "Emotionally mature",
            state: "clarifying",
            currentIntent: {
                rawText: "I want someone calm",
                traits: ["calm"],
            },
            recentMessages: [
                {
                    role: "assistant",
                    text: "When you say that, what matters most: emotional maturity, a quiet personality, or someone low-drama and consistent?",
                },
            ],
        },
        {
            messageType: "clarifying_question",
            shouldClarify: true,
            reply: "placeholder",
            clarifyingQuestion: "placeholder",
            quickReplies: [],
            intent: {
                rawText: "Emotionally mature",
                traits: [],
                relationshipIntent: "unknown",
                activityRequirement: "any",
                socialEnergy: "unknown",
                dealbreakers: [],
            },
            searchPlan: {
                priorities: [],
                avoid: [],
            },
            provider: "openai",
            model: "gpt-4.1-mini",
            fallbackUsed: false,
        },
    );

    assert.equal(merged.shouldClarify, false);
    assert.equal(merged.messageType, "search_plan");
    assert.ok(merged.intent.traits.includes("emotionally_mature"));
    assert.ok(merged.searchPlan.priorities.includes("emotional maturity"));
    assert.doesNotMatch(merged.reply, /got it\.?\s*i will prioritize/i);
    assert.doesNotMatch(merged.reply, /should i go ahead/i);
});

test("generateMatchmakerLlmTurn throws when provider is unavailable", async () => {
    process.env.MATCHMAKER_LLM_PROVIDER = "scripted";

    await assert.rejects(
        () => generateMatchmakerLlmTurn({
            userMessage: "Someone calm",
            state: "collecting_intent",
        }),
        (error: unknown) => error instanceof MatchmakerLlmUnavailableError,
    );
});

test("isMatchmakerSearchConfirmation recognizes common proceed phrases", () => {
    assert.equal(isMatchmakerSearchConfirmation("yes please"), true);
    assert.equal(isMatchmakerSearchConfirmation("start now"), true);
    assert.equal(isMatchmakerSearchConfirmation("keep searching"), true);
    assert.equal(isMatchmakerSearchConfirmation("thanks"), true);
    assert.equal(isMatchmakerSearchConfirmation("Go ahead and search"), true);
});

test("isMatchmakerSearchRefinement keeps change requests in chat", () => {
    assert.equal(isMatchmakerSearchRefinement("Change something"), true);
    assert.equal(isMatchmakerSearchRefinement("Make it more serious"), true);
    assert.equal(isMatchmakerSearchConfirmation("Change something"), false);
    assert.equal(isMatchmakerSearchConfirmation("Make it more serious"), false);
});

test("buildClarifiedSearchPlanTurn uses canonical ready replies", () => {
    const merged = buildClarifiedSearchPlanTurn(
        {
            userMessage: "Quiet and calm",
            state: "clarifying",
            currentIntent: {
                rawText: "I want someone calm",
                traits: ["calm"],
            },
            recentMessages: [
                {
                    role: "assistant",
                    text: "What matters most here?",
                },
            ],
        },
        {
            messageType: "clarifying_question",
            shouldClarify: true,
            reply: "placeholder",
            clarifyingQuestion: "placeholder",
            quickReplies: ["Yes, start searching", "Thanks"],
            intent: {
                rawText: "Quiet and calm",
                traits: [],
                relationshipIntent: "unknown",
                activityRequirement: "any",
                socialEnergy: "unknown",
                dealbreakers: [],
            },
            searchPlan: {
                priorities: [],
                avoid: [],
            },
            provider: "openai",
            model: "gpt-4.1-mini",
            fallbackUsed: false,
        },
    );

    assert.deepEqual(merged.quickReplies, [
        "Go ahead and search",
        "Change something",
        "Make it more serious",
        "Show someone active",
    ]);
});
