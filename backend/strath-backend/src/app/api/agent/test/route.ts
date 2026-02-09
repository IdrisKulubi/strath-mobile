import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { parseIntent, embedIntent } from "@/services/intent-parser";
import { agentSearch } from "@/services/agent-search";
import { rankCandidates } from "@/services/ranking-service";
import { generateQuickExplanations, generateResultCommentary } from "@/services/explanation-service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ============================================
// TEST-ONLY endpoint — bypasses auth for E2E testing
// DELETE THIS before production
// ============================================

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query, userId, limit = 15 } = body;

        if (!query) return errorResponse("query is required", 400);

        // Get a real user ID if not provided
        let testUserId = userId;
        if (!testUserId) {
            const result = await db.execute(
                sql`SELECT user_id FROM profiles WHERE embedding IS NOT NULL LIMIT 1`
            );
            testUserId = (result.rows?.[0] as Record<string, unknown>)?.user_id;
            if (!testUserId) return errorResponse("No profiles with embeddings found", 500);
        }

        const timings: Record<string, number> = {};
        const start = Date.now();

        // 1. Parse intent
        const t1 = Date.now();
        const intent = await parseIntent(query);
        timings.parseIntent = Date.now() - t1;

        // 2. Embed intent
        const t2 = Date.now();
        const intentEmbedding = await embedIntent(intent);
        timings.embedIntent = Date.now() - t2;

        // 3. Search
        const t3 = Date.now();
        const searchResults = await agentSearch(testUserId, intent, intentEmbedding, limit);
        timings.agentSearch = Date.now() - t3;

        // 4. Rank
        const t4 = Date.now();
        const ranked = rankCandidates(searchResults.candidates, intent);
        timings.ranking = Date.now() - t4;

        // 5. Explanations
        const t5 = Date.now();
        const explanations = generateQuickExplanations(ranked, intent);
        timings.explanations = Date.now() - t5;

        // 6. Commentary
        const commentary = await generateResultCommentary(ranked.length, intent, ranked[0]);

        timings.total = Date.now() - start;

        return successResponse({
            commentary,
            testUserId,
            intent: {
                vibe: intent.vibe,
                confidence: intent.confidence,
                semanticQuery: intent.semanticQuery,
                filters: intent.filters,
                preferences: intent.preferences,
            },
            searchMethod: searchResults.searchMethod,
            debugInfo: searchResults.debugInfo,
            matchCount: ranked.length,
            matches: ranked.slice(0, 10).map((r, i) => ({
                name: r.profile.firstName,
                age: r.profile.age,
                course: r.profile.course,
                year: r.profile.yearOfStudy,
                interests: (r.profile.interests || []).slice(0, 5),
                score: r.scores.total,
                vectorScore: Math.round(r.scores.vector * 100),
                preferenceScore: Math.round(r.scores.preference * 100),
                filterMatch: r.scores.filterMatch,
                reasons: r.matchReasons,
                explanation: explanations[i],
            })),
            timings,
        });
    } catch (error) {
        console.error("[Agent Test] Error:", error);
        return errorResponse(error instanceof Error ? error.message : "Test failed", 500);
    }
}
