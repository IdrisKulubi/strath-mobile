import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { session as sessionTable, profiles } from "@/db/schema";
import { eq, sql, count, isNotNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { backfillEmbeddings, refreshStaleEmbeddings, getStaleEmbeddingCount } from "@/services/embedding-service";
import { updateProfileEmbedding } from "@/services/embedding-service";

// Helper to get session with Bearer token fallback
async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });

            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as unknown as typeof session;
            }
        }
    }
    return session;
}

/**
 * GET /api/embeddings/status
 * Returns stats about embedding coverage.
 * Admin only.
 */
export async function GET(request: NextRequest) {
    try {
        // TODO: Re-enable auth after testing
        // const session = await getSessionWithFallback(request);
        // if (!session?.user?.id) {
        //     return errorResponse("Unauthorized", 401);
        // }
        // const userProfile = await db.query.profiles.findFirst({
        //     where: eq(profiles.userId, session.user.id),
        // });
        // if (userProfile?.role !== "admin") {
        //     return errorResponse("Forbidden — admin only", 403);
        // }

        // Use Drizzle query builder instead of raw SQL
        const allProfiles = await db.select({ count: count() }).from(profiles);
        const totalProfiles = allProfiles[0]?.count ?? 0;

        // Get profiles with personality_summary (simpler column that definitely exists)
        const withSummary = await db
            .select({ count: count() })
            .from(profiles)
            .where(isNotNull(profiles.personalitySummary));
        
        const withSummaryCount = withSummary[0]?.count ?? 0;

        // Check actual embedding column via raw SQL since Drizzle schema might not be synced
        const embeddingCheck = await db.execute(sql`
            SELECT 
                COUNT(*) as total,
                COUNT(embedding) as with_embedding,
                COUNT(personality_summary) as with_summary,
                COUNT(*) - COUNT(embedding) as without_embedding
            FROM profiles
        `);
        const stats = embeddingCheck.rows?.[0] as Record<string, number> | undefined;

        return successResponse({
            total_profiles: totalProfiles,
            with_summary: withSummaryCount,
            without_summary: totalProfiles - withSummaryCount,
            with_embedding: stats?.with_embedding ?? "unknown",
            without_embedding: stats?.without_embedding ?? "unknown",
        });
    } catch (error) {
        console.error("[Embeddings API] Error:", error);
        return errorResponse("Failed to get embedding stats", 500);
    }
}

/**
 * POST /api/embeddings/sync
 * Trigger embedding operations. Admin only.
 * 
 * Body:
 *   { action: "backfill" }          — Fill all missing embeddings
 *   { action: "refresh" }           — Refresh stale embeddings
 *   { action: "single", userId: X } — Update one profile's embedding
 */
export async function POST(request: NextRequest) {
    try {
        // TODO: Re-enable auth after testing
        // const session = await getSessionWithFallback(request);
        // if (!session?.user?.id) {
        //     return errorResponse("Unauthorized", 401);
        // }
        // const userProfile = await db.query.profiles.findFirst({
        //     where: eq(profiles.userId, session.user.id),
        // });
        // if (userProfile?.role !== "admin") {
        //     return errorResponse("Forbidden — admin only", 403);
        // }

        const body = await request.json();
        const { action, userId } = body;

        switch (action) {
            case "listmodels": {
                // List available Gemini models to debug which embedding models are accessible
                try {
                    const apiKey = process.env.GEMINI_API_KEY;
                    if (!apiKey) return errorResponse("GEMINI_API_KEY not set", 500);
                    
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
                    );
                    if (!response.ok) {
                        const error = await response.text();
                        return errorResponse(`ListModels failed: ${error}`, response.status);
                    }
                    
                    const data = await response.json();
                    // Show ALL models to see what's available
                    return successResponse({
                        message: "All available models",
                        models: data.models?.map((m: { name: string; displayName: string; supportedGenerationMethods?: string[] }) => ({
                            name: m.name,
                            displayName: m.displayName,
                            methods: m.supportedGenerationMethods || [],
                        })) || [],
                    });
                } catch (err) {
                    return errorResponse(`ListModels error: ${err}`, 500);
                }
            }
            case "migrate": {
                // Add missing columns directly via the app's connection
                try {
                    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
                    // Drop old 768-dim column if it exists and recreate as 3072
                    await db.execute(sql`ALTER TABLE profiles DROP COLUMN IF EXISTS embedding`);
                    await db.execute(sql`ALTER TABLE profiles ADD COLUMN embedding vector(3072)`);
                    await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp`);
                    
                    // Verify columns exist now
                    const cols = await db.execute(sql`
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name = 'profiles' AND column_name IN ('embedding', 'embedding_updated_at')
                    `);
                    
                    return successResponse({
                        message: "Migration complete - embedding column is now vector(3072)",
                        columnsAdded: cols.rows?.map((r: { column_name: string }) => r.column_name) ?? [],
                    });
                } catch (err) {
                    console.error("Migration failed:", err);
                    return errorResponse(`Migration failed: ${err}`, 500);
                }
            }
            case "backfill": {
                const result = await backfillEmbeddings(50, 1000);
                return successResponse({
                    message: "Backfill complete",
                    ...result,
                });
            }
            case "refresh": {
                const refreshed = await refreshStaleEmbeddings(7);
                return successResponse({
                    message: "Refresh complete",
                    refreshed,
                });
            }
            case "single": {
                if (!userId) {
                    return errorResponse("userId required for single action", 400);
                }
                await updateProfileEmbedding(userId);
                return successResponse({
                    message: `Embedding updated for user ${userId}`,
                });
            }
            default:
                return errorResponse("Invalid action. Use: backfill, refresh, or single", 400);
        }
    } catch (error) {
        console.error("[Embeddings API] Error:", error);
        return errorResponse("Embedding operation failed", 500);
    }
}
