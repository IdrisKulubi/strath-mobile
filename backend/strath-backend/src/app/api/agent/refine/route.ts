import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { parseIntent, embedIntent } from "@/services/intent-parser";
import { agentSearch } from "@/services/agent-search";
import { rankCandidates } from "@/services/ranking-service";
import { generateQuickExplanations, generateResultCommentary } from "@/services/explanation-service";
import { getAgentContext, recordQuery, saveAgentMessage } from "@/services/agent-context";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type MinimalSession = {
    user: {
        id: string;
        name?: string | null;
    };
};

function buildRefinementHints(query: string): string[] {
    const baseHints = [
        "more outgoing",
        "same course",
        "different personality type",
        "more academically focused",
        "more spontaneous",
    ];

    const lowered = query.toLowerCase();
    return baseHints.filter((hint) => !lowered.includes(hint.split(" ")[1] || hint)).slice(0, 4);
}

async function getSessionWithFallback(req: NextRequest): Promise<MinimalSession | null> {
    const session = await auth.api.getSession({ headers: req.headers });

    if (session?.user?.id) {
        return {
            user: {
                id: session.user.id,
                name: session.user.name,
            },
        };
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const { session: sessionTable } = await import("@/db/schema");
        const dbSession = await db.query.session.findFirst({
            where: eq(sessionTable.token, token),
            with: { user: true },
        });
        if (dbSession && dbSession.expiresAt > new Date()) {
            return {
                user: {
                    id: dbSession.user.id,
                    name: dbSession.user.name,
                },
            };
        }
    }

    return null;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let step = "init";

    try {
        step = "auth";
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        step = "parse_body";
        const body = await request.json();
        const {
            original_query,
            refinement,
            previous_match_ids = [],
            limit = 20,
            offset = 0,
        } = body;

        if (!original_query || typeof original_query !== "string") {
            return errorResponse("original_query is required", 400);
        }

        if (!refinement || typeof refinement !== "string") {
            return errorResponse("refinement is required", 400);
        }

        const effectiveQuery = `${original_query.trim()}, but ${refinement.trim()}`;
        if (effectiveQuery.length > 700) {
            return errorResponse("Refined query too long", 400);
        }

        const userId = session.user.id;

        step = "agent_context";
        const agentCtx = await getAgentContext(userId);

        step = "parse_intent";
        const intent = await parseIntent(effectiveQuery, null, agentCtx.learnedPreferences);

        step = "embed_intent";
        const intentEmbedding = await embedIntent(intent);

        step = "agent_search";
        const searchResults = await agentSearch(
            userId,
            intent,
            intentEmbedding,
            Math.min(limit, 50),
            offset,
            previous_match_ids,
        );

        step = "rank";
        const ranked = rankCandidates(searchResults.candidates, intent, agentCtx.learnedPreferences);

        step = "explanations";
        const explanations = generateQuickExplanations(ranked, intent);

        const matches = ranked.map((candidate, i) => ({
            profile: sanitizeProfile(candidate.profile),
            explanation: explanations[i],
            scores: {
                total: candidate.scores.total,
                vector: Math.round(candidate.scores.vector * 100),
                preference: Math.round(candidate.scores.preference * 100),
                filterMatch: candidate.scores.filterMatch,
            },
        }));

        let commentary = "Refined your results.";
        try {
            commentary = await generateResultCommentary(matches.length, intent, ranked[0]);
        } catch {}

        const matchedIds = ranked.map(r => r.profile.userId);
        recordQuery(userId, effectiveQuery, matchedIds).catch(console.error);
        saveAgentMessage(userId, commentary).catch(console.error);

        const latency = Date.now() - startTime;
        const refinementHints = buildRefinementHints(effectiveQuery);

        return successResponse({
            commentary,
            matches,
            refinement_hints: refinementHints,
            intent: {
                vibe: intent.vibe,
                confidence: intent.confidence,
                semanticQuery: intent.semanticQuery,
                isRefinement: true,
            },
            meta: {
                totalFound: matches.length,
                hasMore: matches.length === limit,
                nextOffset: offset + matches.length,
                searchMethod: searchResults.searchMethod,
                latencyMs: latency,
            },
            effectiveQuery,
        });
    } catch (error) {
        const latency = Date.now() - startTime;
        console.error(`[AgentRefine API] Error at step=\"${step}\" (${latency}ms):`, error);
        const message = error instanceof Error ? error.message : "Refinement failed";
        return errorResponse(`Refinement failed at ${step}: ${message}`, 500);
    }
}

function sanitizeProfile(profile: Record<string, unknown>) {
    const clean = { ...profile };
    delete clean.embedding;
    delete clean.embeddingUpdatedAt;
    delete clean.isVisible;
    delete clean.profileCompleted;
    return clean;
}
