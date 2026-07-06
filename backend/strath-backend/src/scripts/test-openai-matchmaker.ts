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

import { generateMatchmakerLlmTurn } from "@/lib/services/matchmaker-llm-client";

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

    const turn = await generateMatchmakerLlmTurn({
        userMessage: "I want someone calm, intentional, active today, and easy to talk to.",
        state: "collecting_intent",
        recentMessages: [
            {
                role: "assistant",
                text: "What kind of person would feel right for you today?",
            },
        ],
    });

    if (turn.provider !== "openai" || turn.fallbackUsed) {
        throw new Error(`OpenAI smoke test failed. provider=${turn.provider}, fallbackUsed=${turn.fallbackUsed}`);
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
    }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
