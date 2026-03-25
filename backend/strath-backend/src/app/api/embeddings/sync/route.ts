import { NextRequest } from "next/server";
import { count, isNotNull, sql } from "drizzle-orm";

import { profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/security";
import {
    backfillEmbeddings,
    getStaleEmbeddingCount,
    refreshStaleEmbeddings,
    updateProfileEmbedding,
} from "@/services/embedding-service";

export async function GET(request: NextRequest) {
    try {
        const session = await requireAdminApiSession(request);
        if (!session?.user?.id) {
            return errorResponse("Forbidden - admin only", 403);
        }

        const allProfiles = await db.select({ count: count() }).from(profiles);
        const totalProfiles = allProfiles[0]?.count ?? 0;

        const withSummary = await db
            .select({ count: count() })
            .from(profiles)
            .where(isNotNull(profiles.personalitySummary));

        const withSummaryCount = withSummary[0]?.count ?? 0;

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

export async function POST(request: NextRequest) {
    try {
        const session = await requireAdminApiSession(request);
        if (!session?.user?.id) {
            return errorResponse("Forbidden - admin only", 403);
        }

        const body = await request.json();
        const { action, userId } = body;

        switch (action) {
            case "listmodels": {
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
                    return successResponse({
                        message: "All available models",
                        models:
                            data.models?.map(
                                (m: {
                                    name: string;
                                    displayName: string;
                                    supportedGenerationMethods?: string[];
                                }) => ({
                                    name: m.name,
                                    displayName: m.displayName,
                                    methods: m.supportedGenerationMethods || [],
                                })
                            ) || [],
                    });
                } catch (err) {
                    return errorResponse(`ListModels error: ${err}`, 500);
                }
            }
            case "migrate": {
                try {
                    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
                    await db.execute(sql`ALTER TABLE profiles DROP COLUMN IF EXISTS embedding`);
                    await db.execute(sql`ALTER TABLE profiles ADD COLUMN embedding vector(3072)`);
                    await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp`);

                    const cols = await db.execute(sql`
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name = 'profiles' AND column_name IN ('embedding', 'embedding_updated_at')
                    `);

                    return successResponse({
                        message: "Migration complete - embedding column is now vector(3072)",
                        columnsAdded: cols.rows?.map((r) => (r as Record<string, string>).column_name) ?? [],
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
                const staleCount = await getStaleEmbeddingCount(7);
                const refreshed = await refreshStaleEmbeddings(7);
                return successResponse({
                    message: "Refresh complete",
                    staleCount,
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
