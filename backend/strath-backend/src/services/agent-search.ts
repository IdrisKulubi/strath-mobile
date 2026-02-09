import { db } from "../lib/db";
import { profiles, swipes, blocks, matches } from "../db/schema";
import { eq, and, notInArray, inArray, sql, gte, lte, like, isNotNull, or } from "drizzle-orm";
import type { ParsedIntent } from "./intent-parser";

// ============================================
// AGENT SEARCH SERVICE
// ============================================
// Combines traditional SQL filtering with pgvector semantic search.
// This is the retrieval layer — it finds candidates, then the
// ranking service scores them.
//
// Pipeline:
// 1. Build exclusion list (already swiped, blocked, self)
// 2. Apply hard filters (gender, year, etc.)
// 3. Run pgvector similarity search against intent embedding
// 4. Merge and deduplicate results
// 5. Return raw candidates for ranking

export interface SearchCandidate {
    profile: typeof profiles.$inferSelect & { user?: { name: string; email: string } | null };
    vectorScore: number;    // Cosine similarity (0-1) — higher = more similar
    filterMatch: boolean;   // Did this candidate pass all hard filters?
}

export interface SearchResult {
    candidates: SearchCandidate[];
    totalFound: number;
    searchMethod: "hybrid" | "vector_only" | "filter_only";
    debugInfo?: {
        excludedCount: number;
        filterPassCount: number;
        vectorMatchCount: number;
    };
}

/**
 * Execute a hybrid search combining SQL filters + vector similarity.
 * 
 * Strategy:
 * - If the intent has specific filters → use them as WHERE clauses
 * - Always run vector search if we have an embedding
 * - Merge results, preferring candidates that match BOTH
 *
 * @param userId - The searching user's ID
 * @param intent - Parsed search intent
 * @param intentEmbedding - The intent's embedding vector (3072 dims)
 * @param limit - Max results to return (default 30)
 * @param offset - For pagination on "show me more" refinements
 */
export async function agentSearch(
    userId: string,
    intent: ParsedIntent,
    intentEmbedding: number[],
    limit: number = 30,
    offset: number = 0,
    excludeUserIds: string[] = [],
): Promise<SearchResult> {
    // 1. Build exclusion list
    const excludedIds = await buildExclusionList(userId, excludeUserIds);

    // 2. Get user's own profile for context (gender preferences, etc.)
    const userProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    // 3. Run dual search strategy
    const [vectorResults, filterResults] = await Promise.all([
        vectorSearch(intentEmbedding, excludedIds, limit + 10, userProfile),
        filterSearch(intent, excludedIds, limit + 10, userProfile),
    ]);

    // 4. Merge and deduplicate
    const candidates = mergeResults(vectorResults, filterResults, limit, offset);

    return {
        candidates,
        totalFound: candidates.length,
        searchMethod: vectorResults.length > 0 && filterResults.length > 0 
            ? "hybrid" 
            : vectorResults.length > 0 ? "vector_only" : "filter_only",
        debugInfo: {
            excludedCount: excludedIds.length,
            filterPassCount: filterResults.length,
            vectorMatchCount: vectorResults.length,
        },
    };
}

/**
 * Build the list of user IDs to exclude from search results.
 * Includes: self, already swiped, blocked users, users who blocked us.
 */
async function buildExclusionList(userId: string, additionalExcludes: string[] = []): Promise<string[]> {
    const [swipedUsers, blockedUsers, blockedByUsers] = await Promise.all([
        db.select({ id: swipes.swipedId }).from(swipes).where(eq(swipes.swiperId, userId)),
        db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, userId)),
        db.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, userId)),
    ]);

    return [
        userId,
        ...swipedUsers.map(u => u.id),
        ...blockedUsers.map(u => u.id),
        ...blockedByUsers.map(u => u.id),
        ...additionalExcludes,
    ];
}

/**
 * Vector similarity search using pgvector.
 * Finds profiles whose embeddings are most similar to the intent embedding.
 * Uses cosine distance operator (<=>).
 */
async function vectorSearch(
    intentEmbedding: number[],
    excludedIds: string[],
    limit: number,
    userProfile?: typeof profiles.$inferSelect | null,
): Promise<SearchCandidate[]> {
    try {
        const embeddingStr = `[${intentEmbedding.join(",")}]`;

        // Build gender filter for the vector search
        const targetGenders = getTargetGenders(userProfile);
        const genderFilter = targetGenders.length > 0
            ? sql`AND gender = ANY(ARRAY[${sql.raw(targetGenders.map(g => `'${g}'`).join(","))}]::text[])`
            : sql``;

        // Exclusion filter
        const excludeFilter = excludedIds.length > 0
            ? sql`AND user_id != ALL(ARRAY[${sql.raw(excludedIds.map(id => `'${id}'`).join(","))}]::text[])`
            : sql``;

        const results = await db.execute(sql`
            SELECT 
                user_id,
                first_name,
                last_name,
                bio,
                age,
                gender,
                interests,
                photos,
                profile_photo,
                course,
                year_of_study,
                university,
                personality_summary,
                looking_for,
                about_me,
                qualities,
                workout_frequency,
                drinking_preference,
                smoking,
                personality_type,
                communication_style,
                love_language,
                religion,
                politics,
                languages,
                last_active,
                prompts,
                1 - (embedding <=> ${embeddingStr}::vector) as similarity
            FROM profiles
            WHERE embedding IS NOT NULL
            AND is_visible = true
            AND profile_completed = true
            ${genderFilter}
            ${excludeFilter}
            ORDER BY embedding <=> ${embeddingStr}::vector
            LIMIT ${limit}
        `);

        return (results.rows || []).map((row: Record<string, unknown>) => ({
            profile: rowToProfile(row),
            vectorScore: Number(row.similarity) || 0,
            filterMatch: false, // Will be updated in merge
        }));
    } catch (error) {
        console.error("[AgentSearch] Vector search failed:", error);
        return [];
    }
}

/**
 * Traditional SQL filter search based on hard constraints from the intent.
 */
async function filterSearch(
    intent: ParsedIntent,
    excludedIds: string[],
    limit: number,
    userProfile?: typeof profiles.$inferSelect | null,
): Promise<SearchCandidate[]> {
    try {
        const conditions: ReturnType<typeof eq>[] = [];

        // Base conditions
        conditions.push(eq(profiles.isVisible, true));
        conditions.push(eq(profiles.profileCompleted, true));

        // Exclude already-seen users
        if (excludedIds.length > 0) {
            conditions.push(notInArray(profiles.userId, excludedIds));
        }

        // Gender targeting
        const targetGenders = intent.filters.gender || getTargetGenders(userProfile);
        if (targetGenders.length > 0) {
            conditions.push(inArray(profiles.gender, targetGenders));
        }

        // Year of study
        if (intent.filters.yearOfStudy && intent.filters.yearOfStudy.length > 0) {
            conditions.push(inArray(profiles.yearOfStudy, intent.filters.yearOfStudy));
        }

        // Course (partial match)
        if (intent.filters.course) {
            conditions.push(like(profiles.course, `%${intent.filters.course}%`));
        }

        // University
        if (intent.filters.university) {
            conditions.push(eq(profiles.university, intent.filters.university));
        }

        // Age range
        if (intent.filters.ageRange) {
            if (intent.filters.ageRange.min) {
                conditions.push(gte(profiles.age, intent.filters.ageRange.min));
            }
            if (intent.filters.ageRange.max) {
                conditions.push(lte(profiles.age, intent.filters.ageRange.max));
            }
        }

        // Religion
        if (intent.filters.religion) {
            conditions.push(eq(profiles.religion, intent.filters.religion));
        }

        // Smoking
        if (intent.filters.smoking) {
            conditions.push(eq(profiles.smoking, intent.filters.smoking));
        }

        // Drinking
        if (intent.filters.drinking) {
            conditions.push(eq(profiles.drinkingPreference, intent.filters.drinking));
        }

        // Must have embedding for quality results
        conditions.push(isNotNull(profiles.embedding));

        const results = await db.query.profiles.findMany({
            where: and(...conditions),
            with: { user: true },
            limit,
        });

        return results.map(profile => ({
            profile: profile as SearchCandidate["profile"],
            vectorScore: 0, // Will be calculated in ranking
            filterMatch: true,
        }));
    } catch (error) {
        console.error("[AgentSearch] Filter search failed:", error);
        return [];
    }
}

/**
 * Merge vector and filter results, preferring candidates that appear in both.
 */
function mergeResults(
    vectorResults: SearchCandidate[],
    filterResults: SearchCandidate[],
    limit: number,
    offset: number,
): SearchCandidate[] {
    const candidateMap = new Map<string, SearchCandidate>();

    // Add vector results first
    for (const result of vectorResults) {
        const userId = result.profile.userId;
        candidateMap.set(userId, result);
    }

    // Merge filter results — boost score if also in vector results
    for (const result of filterResults) {
        const userId = result.profile.userId;
        if (candidateMap.has(userId)) {
            // Candidate found by BOTH methods — mark as filter match + keep vector score
            const existing = candidateMap.get(userId)!;
            existing.filterMatch = true;
        } else {
            // Only found by filter — add with zero vector score
            candidateMap.set(userId, result);
        }
    }

    // Sort: prioritize candidates found by both methods, then by vector score
    const sorted = Array.from(candidateMap.values()).sort((a, b) => {
        // Both matched by filter? Compare by vector score
        if (a.filterMatch && b.filterMatch) return b.vectorScore - a.vectorScore;
        // Filter match first
        if (a.filterMatch && !b.filterMatch) return -1;
        if (!a.filterMatch && b.filterMatch) return 1;
        // Neither matched by filter — pure vector score
        return b.vectorScore - a.vectorScore;
    });

    return sorted.slice(offset, offset + limit);
}

/**
 * Get target genders based on user's preferences.
 */
function getTargetGenders(userProfile?: typeof profiles.$inferSelect | null): string[] {
    if (!userProfile) return [];
    
    const interestedIn = userProfile.interestedIn as string[] | null;
    if (interestedIn && interestedIn.length > 0) return interestedIn;
    
    // Default: show opposite gender
    if (userProfile.gender === "male") return ["female"];
    if (userProfile.gender === "female") return ["male"];
    return [];
}

/**
 * Convert a raw SQL row to a profile-like object.
 */
function rowToProfile(row: Record<string, unknown>): SearchCandidate["profile"] {
    return {
        id: row.id as string || "",
        userId: row.user_id as string,
        firstName: row.first_name as string || "",
        lastName: row.last_name as string || "",
        bio: row.bio as string | null,
        age: row.age as number | null,
        gender: row.gender as string | null,
        interests: row.interests as string[] | null,
        photos: row.photos as string[] | null,
        profilePhoto: row.profile_photo as string | null,
        course: row.course as string | null,
        yearOfStudy: row.year_of_study as number | null,
        university: row.university as string | null,
        personalitySummary: row.personality_summary as string | null,
        lookingFor: row.looking_for as string | null,
        aboutMe: row.about_me as string | null,
        qualities: row.qualities as string[] | null,
        workoutFrequency: row.workout_frequency as string | null,
        drinkingPreference: row.drinking_preference as string | null,
        smoking: row.smoking as string | null,
        personalityType: row.personality_type as string | null,
        communicationStyle: row.communication_style as string | null,
        loveLanguage: row.love_language as string | null,
        religion: row.religion as string | null,
        politics: row.politics as string | null,
        languages: row.languages as string[] | null,
        lastActive: row.last_active as Date | null,
        prompts: row.prompts as { promptId: string; response: string }[] | null,
    } as SearchCandidate["profile"];
}
