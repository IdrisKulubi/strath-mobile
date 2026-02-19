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

function buildRefinementHints(query: string, vibe?: string): string[] {
    const baseHints = [
        "more introverted",
        "closer to campus",
        "older by 1-2 years",
        "more ambitious",
        "more chill",
        "more into fitness",
    ];

    const lowered = query.toLowerCase();
    const hints = baseHints.filter((hint) => !lowered.includes(hint.split(" ")[1] || hint));

    if (vibe && vibe !== "any") {
        hints.unshift(`keep ${vibe} vibe, but more expressive`);
    }

    return [...new Set(hints)].slice(0, 4);
}

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
        const { query, limit = 20, offset = 0, excludeIds = [] } = body;

        if (!query || typeof query !== "string" || query.trim().length === 0) {
            return errorResponse("Query is required", 400);
        }

        if (query.length > 500) {
            return errorResponse("Query too long (max 500 chars)", 400);
        }

        const userId = session.user.id;

        // 1. Get wingman memory
        step = "agent_context";
        let agentCtx: Awaited<ReturnType<typeof getAgentContext>>;
        try {
            agentCtx = await getAgentContext(userId);
        } catch (ctxErr) {
            console.error("[AgentSearch] agent_context failed:", ctxErr);
            // Fallback: continue without context
            agentCtx = { learnedPreferences: {}, queryHistory: [], matchFeedback: [], lastAgentMessage: null };
        }

        // 2. Parse intent
        step = "parse_intent";
        let intent: Awaited<ReturnType<typeof parseIntent>>;
        let intentParseFailed = false;
        try {
            intent = await parseIntent(
                query.trim(),
                null,
                agentCtx.learnedPreferences,
            );
        } catch (intentErr) {
            console.error("[AgentSearch] parse_intent failed:", intentErr);
            // Fallback: use a simple intent
            intentParseFailed = true;
            intent = {
                vibe: "any" as const,
                filters: {},
                preferences: { traits: [], interests: [], personality: [] },
                semanticQuery: query.trim(),
                confidence: 0.2,
                isRefinement: false,
            };
        }

        // 3. Embed intent for vector search
        step = "embed_intent";
        let intentEmbedding: number[] | null;
        let embeddingFailed = false;
        try {
            // If the LLM failed to parse intent, follow the spec: fallback to structured-only (no semantic)
            // rather than attempting semantic embeddings.
            if (intentParseFailed) {
                intentEmbedding = null;
            } else {
                intentEmbedding = await embedIntent(intent);
            }
        } catch (embErr) {
            console.error("[AgentSearch] embed_intent failed:", embErr);
            // Fallback to structured-only search instead of failing hard.
            embeddingFailed = true;
            intentEmbedding = null;
        }

        // 4. Search
        step = "agent_search";
        let searchResults = await agentSearch(
            userId,
            intent,
            intentEmbedding,
            Math.min(limit, 50),
            offset,
            excludeIds,
        );

        // 5. Rank
        step = "rank";
        let intentForResults = intent;

        let ranked = rankCandidates(
            searchResults.candidates,
            intent,
            agentCtx.learnedPreferences,
        );

        // Empty results boundary: broaden once and return "close" matches.
        if (ranked.length === 0) {
            step = "empty_results_fallback";
            const broadenedIntent = {
                ...intent,
                filters: {},
                confidence: Math.min(intent.confidence ?? 0.2, 0.2),
            };
            intentForResults = broadenedIntent;

            searchResults = await agentSearch(
                userId,
                broadenedIntent,
                intentEmbedding,
                Math.min(limit, 50),
                offset,
                excludeIds,
            );

            ranked = rankCandidates(
                searchResults.candidates,
                intentForResults,
                agentCtx.learnedPreferences,
            );

            // Use the exact UX string requested.
            // Note: We still return results if available; if not, the client will show the empty message.
        }

        // 6. Generate explanations
        step = "explanations";
        const explanations = generateQuickExplanations(ranked, intentForResults);

        // 7. Build response
        step = "build_response";
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
        step = "commentary";
        let commentary = "Here are your matches!";

        if (matches.length === 0) {
            commentary = "No one matched exactly. Here's who came close.";
        } else if (intentParseFailed || embeddingFailed) {
            // Keep copy simple and safe; client UI can still show results.
            commentary = "No worries — I found some close matches.";
        } else {
            try {
                commentary = await generateResultCommentary(
                    matches.length,
                    intentForResults,
                    ranked[0],
                );
            } catch (commentaryErr) {
                console.error("[AgentSearch] commentary failed:", commentaryErr);
                // Non-fatal — use fallback above
            }
        }

        // 9. Save to wingman memory (fire and forget)
        const matchedIds = ranked.map(r => r.profile.userId);
        recordQuery(userId, query.trim(), matchedIds).catch(console.error);
        saveAgentMessage(userId, commentary).catch(console.error);

        const latency = Date.now() - startTime;
        const refinementHints = buildRefinementHints(query.trim(), intent.vibe);

        return successResponse({
            commentary,
            matches,
            refinement_hints: refinementHints,
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
        const latency = Date.now() - startTime;
        console.error(`[AgentSearch API] Error at step="${step}" (${latency}ms):`, error);
        const message = error instanceof Error ? error.message : "Search failed";
        return errorResponse(`Search failed at ${step}: ${message}`, 500);
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
