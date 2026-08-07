import test from "node:test";
import assert from "node:assert/strict";

import {
    answerAddressesActiveQuestion,
    buildClarifiedSearchPlanTurn,
    coerceActivityRequirement,
    coerceRelationshipIntent,
    coerceSocialEnergy,
    generateMatchmakerLlmTurn,
    inferStructuredIntent,
    isMatchmakerSearchConfirmation,
    isMatchmakerSearchRefinement,
    MatchmakerLlmUnavailableError,
    parseMatchmakerLlmTurnRaw,
    resolveMatchmakerClarifyingQuickReplies,
    wrapMatchmakerLlmRetryFailure,
} from "@/lib/services/matchmaker-llm-client";

const baseTurn = {
    messageType: "clarifying_question" as const,
    shouldClarify: true,
    reply: "Which social energy feels right?",
    clarifyingQuestion: "Which social energy feels right?",
    quickReplies: [],
    intent: {
        rawText: "",
        traits: [],
        relationshipIntent: "unknown" as const,
        activityRequirement: "any" as const,
        socialEnergy: "unknown" as const,
        dealbreakers: [],
    },
    searchPlan: { priorities: [], avoid: [] },
    provider: "openai" as const,
    model: "gpt-4.1-mini",
    fallbackUsed: false,
};

test("an unrelated answer does not resolve the active question", () => {
    const input = {
        userMessage: "Emotional maturity matters a lot",
        state: "clarifying" as const,
        activeQuestion: {
            key: "social-energy",
            category: "social_energy" as const,
            question: "Do you prefer quiet, balanced, or social energy?",
        },
    };
    assert.equal(answerAddressesActiveQuestion(input, {
        ...baseTurn,
        preferenceProposals: [{
            category: "values",
            value: "emotionally mature",
            sentiment: "prefer",
            importance: "must_have",
            evidence: "explicit",
        }],
    }), false);
});

test("an explicit category answer or flexible answer resolves the active question", () => {
    const input = {
        userMessage: "Balanced social energy",
        state: "clarifying" as const,
        activeQuestion: {
            key: "social-energy",
            category: "social_energy" as const,
            question: "Do you prefer quiet, balanced, or social energy?",
        },
    };
    assert.equal(answerAddressesActiveQuestion(input, {
        ...baseTurn,
        preferenceProposals: [{
            category: "social_energy",
            value: "balanced",
            sentiment: "prefer",
            importance: "prefer",
            evidence: "explicit",
        }],
    }), true);
    assert.equal(answerAddressesActiveQuestion({ ...input, userMessage: "Either is fine" }, baseTurn), true);
    assert.equal(answerAddressesActiveQuestion({ ...input, userMessage: "I'm not sure yet" }, baseTurn), true);
});

test("clarifying quick replies answer the relationship question instead of stale personality options", () => {
    const replies = resolveMatchmakerClarifyingQuickReplies({
        question: "Do you prefer a serious, casual, or open kind of relationship?",
        category: "relationship_intent",
        suggestedReplies: [
            "Emotionally mature",
            "Quiet and calm",
            "Low-drama and consistent",
            "A mix of all three",
        ],
    });

    assert.deepEqual(replies, [
        "Serious relationship",
        "Something casual",
        "Open relationship",
        "I'm not sure yet",
    ]);
});

test("clarifying quick replies preserve model suggestions for an open-ended category", () => {
    const replies = resolveMatchmakerClarifyingQuickReplies({
        question: "Which shared interest would matter most?",
        category: "interests",
        suggestedReplies: ["Sports", "Music", "Studying together", "Something else"],
    });

    assert.deepEqual(replies, ["Sports", "Music", "Studying together", "Something else"]);
});

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

test("coerceActivityRequirement maps aliases and falls back safely", () => {
    assert.equal(coerceActivityRequirement("active_today"), "active_today");
    assert.equal(coerceActivityRequirement("active_now"), "active_today");
    assert.equal(coerceActivityRequirement("active"), "active_today");
    assert.equal(coerceActivityRequirement("recently"), "active_recently");
    assert.equal(coerceActivityRequirement(""), "any");
    assert.equal(coerceActivityRequirement("bogus"), "any");
});

test("coerceRelationshipIntent and coerceSocialEnergy tolerate LLM drift", () => {
    assert.equal(coerceRelationshipIntent("long-term"), "serious");
    assert.equal(coerceRelationshipIntent("made_up"), "unknown");
    assert.equal(coerceSocialEnergy("introverted"), "quiet");
    assert.equal(coerceSocialEnergy("party"), "social");
    assert.equal(coerceSocialEnergy("???"), "unknown");
});

test("parseMatchmakerLlmTurnRaw coerces invalid activityRequirement values", () => {
    const parsed = parseMatchmakerLlmTurnRaw({
        reply: "Calm sounds like a clear direction.",
        intent: {
            rawText: "I want someone calm",
            traits: ["calm"],
            activityRequirement: "active_now",
            relationshipIntent: "long-term",
            socialEnergy: "introverted",
        },
        searchPlan: {
            priorities: ["calm personality"],
            avoid: [],
        },
    });

    assert.equal(parsed.intent.activityRequirement, "active_today");
    assert.equal(parsed.intent.relationshipIntent, "serious");
    assert.equal(parsed.intent.socialEnergy, "quiet");
});

test("wrapMatchmakerLlmRetryFailure returns a friendly unavailable message", () => {
    const zodJson = '[{"code":"invalid_value","path":["intent","activityRequirement"]}]';
    const error = wrapMatchmakerLlmRetryFailure(new Error(zodJson), "openai");

    assert.ok(error instanceof MatchmakerLlmUnavailableError);
    assert.equal(error.message, "Matchmaker is temporarily unavailable. Please try again.");
    assert.doesNotMatch(error.message, /\[/);
});
