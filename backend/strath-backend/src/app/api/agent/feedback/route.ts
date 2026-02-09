import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { recordMatchFeedback, getAgentContext } from "@/services/agent-context";
import { generateRichExplanation } from "@/services/explanation-service";

export const dynamic = "force-dynamic";

// ============================================
// AGENT FEEDBACK API — POST /api/agent/feedback
// ============================================
// Records user feedback on agent-suggested matches.
// This is how the wingman learns over time.
//
// Actions:
// - "feedback": Record match feedback (amazing/nice/meh/not_for_me)
// - "explain": Get a rich AI explanation for a specific match

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
        const { action } = body;

        switch (action) {
            case "feedback": {
                const { matchedUserId, outcome } = body;
                
                if (!matchedUserId || !outcome) {
                    return errorResponse("matchedUserId and outcome are required", 400);
                }

                const validOutcomes = ["amazing", "nice", "meh", "not_for_me"];
                if (!validOutcomes.includes(outcome)) {
                    return errorResponse(`outcome must be one of: ${validOutcomes.join(", ")}`, 400);
                }

                await recordMatchFeedback(session.user.id, matchedUserId, outcome);

                return successResponse({
                    message: "Feedback recorded — wingman is learning! 🧠",
                    outcome,
                });
            }

            case "explain": {
                const { matchData, query } = body;
                
                if (!matchData) {
                    return errorResponse("matchData is required for explain action", 400);
                }

                // Reconstruct a minimal RankedCandidate and ParsedIntent for the explainer
                const explanation = await generateRichExplanation(
                    {
                        profile: matchData.profile,
                        scores: {
                            total: matchData.scores?.total || 50,
                            vector: (matchData.scores?.vector || 50) / 100,
                            preference: (matchData.scores?.preference || 50) / 100,
                            filterMatch: matchData.scores?.filterMatch || false,
                            completeness: 0.5,
                            recency: 0.5,
                            learnedPref: 0.5,
                        },
                        matchReasons: matchData.explanation?.summary 
                            ? [matchData.explanation.summary] 
                            : ["Recommended by Wingman AI"],
                    },
                    {
                        vibe: "any",
                        filters: {},
                        preferences: { traits: [], interests: [], personality: [] },
                        semanticQuery: query || "",
                        confidence: 0.5,
                        isRefinement: false,
                    },
                    session.user.name || "You",
                );

                return successResponse({ explanation });
            }

            default:
                return errorResponse("Invalid action. Use 'feedback' or 'explain'.", 400);
        }
    } catch (error) {
        console.error("[AgentFeedback API] Error:", error);
        return errorResponse("Feedback failed", 500);
    }
}

/**
 * GET /api/agent/feedback — Get wingman learning stats
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const ctx = await getAgentContext(session.user.id);

        // Summarize what the wingman has learned
        const positiveTraits = Object.entries(ctx.learnedPreferences)
            .filter(([, v]) => v > 0.1)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([k, v]) => ({ trait: k.replace(/_/g, " "), weight: Math.round(v * 100) }));

        const negativeTraits = Object.entries(ctx.learnedPreferences)
            .filter(([, v]) => v < -0.1)
            .sort(([, a], [, b]) => a - b)
            .slice(0, 5)
            .map(([k, v]) => ({ trait: k.replace(/_/g, " "), weight: Math.round(v * 100) }));

        const feedbackSummary = {
            total: ctx.matchFeedback.length,
            amazing: ctx.matchFeedback.filter(f => f.outcome === "amazing").length,
            nice: ctx.matchFeedback.filter(f => f.outcome === "nice").length,
            meh: ctx.matchFeedback.filter(f => f.outcome === "meh").length,
            not_for_me: ctx.matchFeedback.filter(f => f.outcome === "not_for_me").length,
        };

        return successResponse({
            learnedPreferences: {
                likes: positiveTraits,
                dislikes: negativeTraits,
            },
            feedbackSummary,
            queryCount: ctx.queryHistory.length,
            recentQueries: ctx.queryHistory.slice(0, 5).map(q => ({
                query: q.query,
                timestamp: q.timestamp,
                matchCount: q.matchedIds.length,
            })),
        });
    } catch (error) {
        console.error("[AgentFeedback API] Stats error:", error);
        return errorResponse("Failed to get wingman stats", 500);
    }
}
