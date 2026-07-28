/**
 * Smoke test the matchmaker OpenAI provider.
 *
 * Usage:
 *   npx tsx src/scripts/test-openai-matchmaker.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

import {
    generateMatchmakerCandidateIntro,
    generateMatchmakerFeedbackReply,
    generateMatchmakerGreeting,
    generateMatchmakerLimitReply,
    generateMatchmakerLlmTurn,
    generateMatchmakerSearchStatusReply,
} from "@/lib/services/matchmaker-llm-client";

function maskKey(value: string) {
    if (value.length <= 8) return "set";
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function main() {
    process.env.MATCHMAKER_LLM_PROVIDER = "openai";
    process.env.MATCHMAKER_LLM_MODEL ||= "gpt-4.1-mini";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is missing. Add it to .env, .env.local, or your Railway service variables.");
    }

    console.log("Testing matchmaker OpenAI provider...");
    console.log(JSON.stringify({
        provider: process.env.MATCHMAKER_LLM_PROVIDER,
        model: process.env.MATCHMAKER_LLM_MODEL,
        openAiKey: maskKey(apiKey),
    }, null, 2));

    const recentMessages = [{
        role: "assistant" as const,
        text: "What kind of person would feel right for you today?",
    }];
    const [turn, greeting, candidate, feedback, limit, noResult] = await Promise.all([
        generateMatchmakerLlmTurn({
            userMessage: "I want someone calm, intentional, active today, and easy to talk to.",
            state: "collecting_intent",
            recentMessages,
        }),
        generateMatchmakerGreeting({ firstName: "Idris" }),
        generateMatchmakerCandidateIntro({
            firstName: "Maya",
            university: "Strathmore University",
            course: "Business",
            labels: ["Active recently", "Calm"],
            matchReason: "Calm profile signals, active recently, and close to the requested direction.",
            intentText: "Calm, intentional, active today, and easy to talk to.",
            recentMessages,
        }),
        generateMatchmakerFeedbackReply({
            outcome: "not_this_one",
            reason: "Too social",
            recentMessages,
        }),
        generateMatchmakerLimitReply({
            used: 3,
            limit: 3,
            recentMessages,
        }),
        generateMatchmakerSearchStatusReply({
            status: "no_result",
            intentText: "Calm, intentional, active today, and easy to talk to.",
            recentMessages,
        }),
    ]);

    if (turn.provider !== "openai" || turn.fallbackUsed) {
        throw new Error(`OpenAI smoke test failed. provider=${turn.provider}, fallbackUsed=${turn.fallbackUsed}`);
    }
    for (const reply of [greeting, candidate, feedback, limit, noResult]) {
        if (reply.provider !== "openai" || reply.fallbackUsed) {
            throw new Error(`OpenAI voice smoke test failed. provider=${reply.provider}, fallbackUsed=${reply.fallbackUsed}`);
        }
    }
    if (/\b(?:she|her|hers|he|him|his)\b|(?:she|he)[’']s\b/i.test(candidate.text)) {
        throw new Error(`Candidate reply invented gendered language: ${candidate.text}`);
    }
    if (/\b(?:chat|message)\b/i.test(candidate.text)) {
        throw new Error(`Candidate reply offered an unavailable action: ${candidate.text}`);
    }

    console.log("OpenAI smoke test passed.");
    console.log(JSON.stringify({
        provider: turn.provider,
        model: turn.model,
        messageType: turn.messageType,
        shouldClarify: turn.shouldClarify,
        reply: turn.reply,
        traits: turn.intent.traits,
        priorities: turn.searchPlan.priorities,
        greeting: greeting.text,
        candidate: candidate.text,
        feedback: feedback.text,
        limit: limit.text,
        noResult: noResult.text,
    }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
