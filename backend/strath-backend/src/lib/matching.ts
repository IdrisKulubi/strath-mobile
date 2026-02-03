import { db } from "./db";
import { profiles, swipes, blocks } from "../db/schema";
import { eq, and, notInArray, inArray, or } from "drizzle-orm";

/**
 * Simple gender-based matching:
 * - Male users see females
 * - Female users see males  
 * - Users interested in both see both
 */
function getTargetGenders(userGender: string | null, interestedIn: string[] | null): string[] {
    // If user explicitly set their preferences (interested in both, etc.), use those
    if (interestedIn && interestedIn.length > 0) {
        return interestedIn;
    }
    
    // Default: show opposite gender
    if (userGender === 'male') {
        return ['female'];
    } else if (userGender === 'female') {
        return ['male'];
    }
    
    // If user hasn't set gender, show everyone
    return ['male', 'female', 'other'];
}

export async function getRecommendations(userId: string, limit: number = 20, offset: number = 0, vibe: string = 'all') {
    // 1. Get current user profile
    const currentUserProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    console.log('[Matching] User ID:', userId);
    console.log('[Matching] Current user profile:', currentUserProfile ? {
        gender: currentUserProfile.gender,
        interestedIn: currentUserProfile.interestedIn,
    } : 'NOT FOUND');

    if (!currentUserProfile) return [];
    
    // Get target genders - simple logic based on user's gender and preferences
    const targetGenders = getTargetGenders(
        currentUserProfile.gender,
        currentUserProfile.interestedIn as string[] | null
    );
    
    console.log('[Matching] Target genders to show:', targetGenders);

    // 2. Get users already swiped or blocked
    const swipedUsers = await db
        .select({ id: swipes.swipedId })
        .from(swipes)
        .where(eq(swipes.swiperId, userId));

    const blockedUsers = await db
        .select({ id: blocks.blockedId })
        .from(blocks)
        .where(eq(blocks.blockerId, userId));

    const blockedByUsers = await db
        .select({ id: blocks.blockerId })
        .from(blocks)
        .where(eq(blocks.blockedId, userId));

    const excludedIds = [
        userId,
        ...swipedUsers.map((u) => u.id),
        ...blockedUsers.map((u) => u.id),
        ...blockedByUsers.map((u) => u.id),
    ];

    // 3. Fetch potential matches - simple gender filter only
    const candidates = await db.query.profiles.findMany({
        where: and(
            notInArray(profiles.userId, excludedIds),
            eq(profiles.isVisible, true),
            eq(profiles.profileCompleted, true),
            // Simple filter: just match by gender
            targetGenders.length > 0 
                ? inArray(profiles.gender, targetGenders)
                : undefined
        ),
        with: {
            user: true,
        },
        limit: limit + offset + 20,
    });
    
    console.log('[Matching] Candidates found:', candidates.length);

    // 4. Simple scoring - just basics
    const scoredCandidates = candidates.map((candidate) => {
        let score = 0;

        // Same university bonus
        if (candidate.university && currentUserProfile.university && candidate.university === currentUserProfile.university) {
            score += 10;
        }

        // Recent activity bonus
        const lastActive = candidate.lastActive ? new Date(candidate.lastActive).getTime() : 0;
        const oneDay = 24 * 60 * 60 * 1000;
        if (Date.now() - lastActive < oneDay) {
            score += 5;
        }

        // Add some randomness to keep it fresh
        score += Math.random() * 5;

        return { ...candidate, score };
    });

    // 5. Sort by score and return paginated
    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates.slice(offset, offset + limit);
}
