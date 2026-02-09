import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { parseIntent } from "@/services/intent-parser";
import { embedIntent } from "@/services/intent-parser";
import { agentSearch } from "@/services/agent-search";
import { rankCandidates } from "@/services/ranking-service";
import { generateQuickExplanations, generateResultCommentary } from "@/services/explanation-service";
import { getAgentContext, recordQuery, saveAgentMessage } from "@/services/agent-context";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Vercel timeout

// ============================================
// AGENT SEARCH API — POST /api/agent/search
// ============================================
// The main agentic discovery endpoint.
//
// Pipeline:
// 1. Parse natural language query → structured intent
// 2. Embed intent → 3072-dim vector
// 3. Search (vector + SQL filters) → raw candidates
// 4. Rank by multi-factor scoring
// 5. Generate explanations
// 6. Save to wingman memory
//
// Request: { query: string, limit?: number, offset?: number }
// Response: { commentary, matches: [{ profile, explanation, scores }], meta }

async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const { session: sessionTable } = await import("@/db/schema");
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const body = await request.json();
        const { query, limit = 20, offset = 0, excludeIds = [] } = body;

        if (!query || typeof query !== "string" || query.trim().length === 0) {
            return errorResponse("Query is required", 400);
        }

        if (query.length > 500) {
            return errorResponse("Query too long (max 500 chars)", 400);
        }

        const userId = session.user.id;
        const startTime = Date.now();

        // 1. Get wingman memory
        const agentCtx = await getAgentContext(userId);

        // 2. Parse intent
        const intent = await parseIntent(
            query.trim(),
            null, // TODO: reconstruct previous intent from queryHistory
            agentCtx.learnedPreferences,
        );

        // 3. Embed intent for vector search
        const intentEmbedding = await embedIntent(intent);

        // 4. Search
        const searchResults = await agentSearch(
            userId,
            intent,
            intentEmbedding,
            Math.min(limit, 50),
            offset,
            excludeIds,
        );

        // 5. Rank
        const ranked = rankCandidates(
            searchResults.candidates,
            intent,
            agentCtx.learnedPreferences,
        );

        // 6. Generate explanations
        const explanations = generateQuickExplanations(ranked, intent);

        // 7. Build response
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

        // 8. Generate commentary
        const commentary = await generateResultCommentary(
            matches.length,
            intent,
            ranked[0],
        );

        // 9. Save to wingman memory (fire and forget)
        const matchedIds = ranked.map(r => r.profile.userId);
        recordQuery(userId, query.trim(), matchedIds).catch(console.error);
        saveAgentMessage(userId, commentary).catch(console.error);

        const latency = Date.now() - startTime;

        return successResponse({
            commentary,
            matches,
            intent: {
                vibe: intent.vibe,
                confidence: intent.confidence,
                semanticQuery: intent.semanticQuery,
                isRefinement: intent.isRefinement,
            },
            meta: {
                totalFound: matches.length,
                hasMore: matches.length === limit,
                nextOffset: offset + matches.length,
                searchMethod: searchResults.searchMethod,
                latencyMs: latency,
            },
        });
    } catch (error) {
        console.error("[AgentSearch API] Error:", error);
        return errorResponse("Search failed", 500);
    }
}

/**
 * GET /api/agent/search — Quick status / health check
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const agentCtx = await getAgentContext(session.user.id);

        return successResponse({
            status: "ready",
            wingmanMemory: {
                totalQueries: agentCtx.queryHistory.length,
                totalFeedback: agentCtx.matchFeedback.length,
                learnedTraits: Object.keys(agentCtx.learnedPreferences).length,
                lastQuery: agentCtx.queryHistory[0]?.query || null,
                lastMessage: agentCtx.lastAgentMessage,
            },
        });
    } catch (error) {
        console.error("[AgentSearch API] Status error:", error);
        return errorResponse("Failed to get agent status", 500);
    }
}

/**
 * Strip sensitive/heavy fields from profile before sending to client.
 */
function sanitizeProfile(profile: Record<string, unknown>) {
    const { embedding, embeddingUpdatedAt, isVisible, profileCompleted, ...clean } = profile as any;
    return clean;
}
