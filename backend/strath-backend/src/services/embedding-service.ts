import { db } from "../lib/db";
import { profiles } from "../db/schema";
import { eq, isNull, sql } from "drizzle-orm";
import { generateEmbedding } from "../lib/gemini";
import { generateProfileSummary } from "./profile-summarizer";

// ============================================
// EMBEDDING SERVICE
// ============================================
// Manages the generation and storage of profile embeddings.
// Embeddings are 3072-dimensional vectors that capture the
// semantic meaning of a profile for similarity search.

/**
 * Generate and store embedding for a single profile.
 * Called when a profile is created or updated.
 * 
 * Pipeline:
 * 1. Generate personality summary (LLM)
 * 2. Generate embedding from summary (Embedding model)
 * 3. Store both in the profiles table
 * 
 * Cost: ~$0.00004 per profile
 * Latency: ~600ms total
 */
export async function updateProfileEmbedding(userId: string): Promise<void> {
    try {
        // 1. Fetch the full profile
        const profile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, userId),
        });
        
        if (!profile) {
            console.warn(`[EmbeddingService] No profile found for user ${userId}`);
            return;
        }
        
        // 2. Generate personality summary
        const summary = await generateProfileSummary(profile);
        
        // 3. Generate embedding from the summary
        const embedding = await generateEmbedding(summary);
        
        // 4. Store both in the database
        await db
            .update(profiles)
            .set({
                personalitySummary: summary,
                embedding: embedding,
                embeddingUpdatedAt: new Date(),
            })
            .where(eq(profiles.userId, userId));
        
        console.log(`[EmbeddingService] Updated embedding for user ${userId} (${embedding.length} dims)`);
    } catch (error) {
        console.error(`[EmbeddingService] Failed to update embedding for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Batch update embeddings for all profiles that don't have one yet.
 * Used for initial backfill and catching up after errors.
 * 
 * @param batchSize Number of profiles to process per batch (default 50)
 * @param delayMs Delay between batches in ms to respect rate limits (default 1000)
 */
export async function backfillEmbeddings(
    batchSize: number = 50,
    delayMs: number = 1000
): Promise<{ processed: number; failed: number; skipped: number }> {
    let processed = 0;
    let failed = 0;
    let skipped = 0;
    let offset = 0;
    
    console.log("[EmbeddingService] Starting backfill...");
    
    while (true) {
        // Fetch profiles without embeddings
        const batch = await db.query.profiles.findMany({
            where: isNull(profiles.embedding),
            limit: batchSize,
            offset: offset,
        });
        
        if (batch.length === 0) break;
        
        console.log(`[EmbeddingService] Processing batch of ${batch.length} profiles (offset: ${offset})`);
        
        for (const profile of batch) {
            try {
                // Skip profiles that aren't complete enough to summarize
                if (!profile.profileCompleted && !profile.bio && !profile.interests?.length) {
                    skipped++;
                    continue;
                }
                
                await updateProfileEmbedding(profile.userId);
                processed++;
                
                // Small delay between individual profiles to be nice to the API
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`[EmbeddingService] Failed for user ${profile.userId}:`, error);
                failed++;
            }
        }
        
        offset += batchSize;
        
        // Delay between batches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    console.log(`[EmbeddingService] Backfill complete: ${processed} processed, ${failed} failed, ${skipped} skipped`);
    return { processed, failed, skipped };
}

/**
 * Get profiles whose embeddings are stale (older than the given days).
 * Used by nightly cron to keep embeddings fresh.
 */
export async function getStaleEmbeddingCount(staleDays: number = 7): Promise<number> {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);
    
    const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM profiles
        WHERE embedding IS NOT NULL
        AND embedding_updated_at < ${staleDate}
    `);
    
    return Number(result.rows?.[0]?.count ?? 0);
}

/**
 * Refresh stale embeddings for profiles updated since their last embedding.
 */
export async function refreshStaleEmbeddings(staleDays: number = 7): Promise<number> {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);
    
    const staleProfiles = await db.execute(sql`
        SELECT user_id FROM profiles
        WHERE embedding IS NOT NULL
        AND (
            embedding_updated_at < ${staleDate}
            OR updated_at > embedding_updated_at
        )
        LIMIT 100
    `);
    
    let refreshed = 0;
    for (const row of staleProfiles.rows || []) {
        try {
            await updateProfileEmbedding(row.user_id as string);
            refreshed++;
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`[EmbeddingService] Refresh failed for ${row.user_id}:`, error);
        }
    }
    
    return refreshed;
}
