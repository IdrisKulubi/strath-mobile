import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { checkMatchmakerHealthAuth } from "@/lib/security";
import {
    generateMatchmakerGreeting,
    generateMatchmakerLlmTurn,
    getMatchmakerLlmConfig,
    isForbiddenMatchmakerReply,
    MatchmakerLlmUnavailableError,
} from "@/lib/services/matchmaker-llm-client";
import { matchmakerRouteErrorResponse } from "@/lib/services/matchmaker-route-errors";
import { MATCHMAKER_VOICE_VERSION } from "@/lib/services/matchmaker-session-service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function summarizeReply(text: string) {
    return {
        preview: text.slice(0, 160),
        length: text.length,
        forbiddenTemplate: isForbiddenMatchmakerReply(text),
    };
}

export async function GET(req: NextRequest) {
    try {
        const auth = checkMatchmakerHealthAuth(req);
        if (!auth.authorized) {
            return errorResponse(new Error(auth.reason), 401);
        }

        const config = getMatchmakerLlmConfig();
        const live = req.nextUrl.searchParams.get("live") !== "0";

        if (!live) {
            return successResponse({
                status: "configured",
                voiceVersion: MATCHMAKER_VOICE_VERSION,
                ...config,
                hint: "Add ?live=1 or omit live=0 to run an OpenAI smoke check.",
            });
        }

        if (config.provider === "scripted") {
            return errorResponse(
                new Error("MATCHMAKER_LLM_PROVIDER is still set to scripted on this deployment"),
                503,
            );
        }

        if (config.provider === "openai" && !config.openAiKeyConfigured) {
            return errorResponse(new Error("OPENAI_API_KEY is not configured on this deployment"), 503);
        }

        if (config.provider === "gemini" && !config.geminiKeyConfigured) {
            return errorResponse(new Error("GEMINI_API_KEY is not configured on this deployment"), 503);
        }

        const startedAt = Date.now();
        const greeting = await generateMatchmakerGreeting({ firstName: "Tester" });
        const intentTurn = await generateMatchmakerLlmTurn({
            userMessage: "I want someone calm, intentional, active today, and easy to talk to.",
            state: "collecting_intent",
            recentMessages: [{
                role: "assistant",
                text: "What kind of person would feel right for you today?",
            }],
        });

        const checks = {
            greeting: {
                ok: greeting.provider === config.provider && !greeting.fallbackUsed,
                provider: greeting.provider,
                model: greeting.model,
                fallbackUsed: greeting.fallbackUsed,
                ...summarizeReply(greeting.text),
            },
            intentTurn: {
                ok: intentTurn.provider === config.provider && !intentTurn.fallbackUsed,
                provider: intentTurn.provider,
                model: intentTurn.model,
                fallbackUsed: intentTurn.fallbackUsed,
                shouldClarify: intentTurn.shouldClarify,
                ...summarizeReply(intentTurn.reply),
            },
        };

        const failedCheck = Object.entries(checks).find(([, check]) =>
            !check.ok || check.forbiddenTemplate,
        );

        if (failedCheck) {
            const [name, check] = failedCheck;
            return errorResponse(
                new Error(`Matchmaker health check failed on ${name}`),
                503,
            );
        }

        return successResponse({
            status: "healthy",
            voiceVersion: MATCHMAKER_VOICE_VERSION,
            ...config,
            durationMs: Date.now() - startedAt,
            checks,
        });
    } catch (error) {
        console.error("[matchmaker/health] Error:", error);
        if (error instanceof MatchmakerLlmUnavailableError) {
            return matchmakerRouteErrorResponse(error);
        }
        return errorResponse(error);
    }
}
