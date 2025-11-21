import { db } from "./db";
import { profiles, users, swipes, blocks } from "../db/schema";
import { eq, and, notInArray, desc, sql, ne } from "drizzle-orm";

export async function getRecommendations(userId: string) {
    // 1. Get current user profile
    const currentUserProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    if (!currentUserProfile) return [];

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

    // 3. Fetch potential matches
    // Note: In a real app with millions of users, we'd use PostGIS for location 
    // and more efficient queries. For now, we fetch candidates and rank in memory 
    // or use basic SQL filtering.

    const candidates = await db.query.profiles.findMany({
        where: and(
            notInArray(profiles.userId, excludedIds),
            eq(profiles.isVisible, true),
            eq(profiles.profileCompleted, true)
            // Add gender filtering here if needed based on currentUserProfile.lookingFor
        ),
        with: {
            user: true, // Join with user table to get name/image if needed
        },
        limit: 50,
    });

    // 4. Scoring Algorithm
    const scoredCandidates = candidates.map((candidate) => {
        let score = 0;

        // University proximity (Bonus weight)
        if (candidate.university && currentUserProfile.university && candidate.university === currentUserProfile.university) {
            score += 10;
        }

        // Interest overlap
        const commonInterests = (candidate.interests || []).filter((i) =>
            (currentUserProfile.interests || []).includes(i)
        );
        score += commonInterests.length * 2;

        // Recent activity (Bonus weight)
        const lastActive = candidate.lastActive ? new Date(candidate.lastActive).getTime() : 0;
        const oneDay = 24 * 60 * 60 * 1000;
        if (Date.now() - lastActive < oneDay) {
            score += 5;
        }

        return { ...candidate, score };
    });

    // 5. Sort and Shuffle
    // Sort by score desc
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Add a bit of randomness (shuffle top results slightly) to feel organic
    // For simplicity, we just return the sorted list for now, but you could 
    // shuffle the top 10.

    return scoredCandidates;
}
