import { db } from "./db";
import { profiles, swipes, blocks } from "../db/schema";
import { eq, and, notInArray, inArray, or } from "drizzle-orm";

/**
 * Get the genders a user wants to see based on their interestedIn preference.
 * Defaults to opposite gender if not specified.
 */
function getTargetGenders(userGender: string | null, interestedIn: string[] | null): string[] {
    // If user explicitly set their preferences, use those
    if (interestedIn && interestedIn.length > 0) {
        return interestedIn;
    }
    
    // Default: show opposite gender (traditional dating app behavior)
    if (userGender === 'male') {
        return ['female'];
    } else if (userGender === 'female') {
        return ['male'];
    }
    
    // If user hasn't set gender or is 'other', show all genders
    return ['male', 'female', 'other'];
}

export async function getRecommendations(userId: string, limit: number = 20, offset: number = 0, vibe: string = 'all') {
    // 1. Get current user profile
    const currentUserProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    if (!currentUserProfile) return [];
    
    // Get target genders based on user's preferences
    const targetGenders = getTargetGenders(
        currentUserProfile.gender,
        currentUserProfile.interestedIn as string[] | null
    );

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

    // 3. Fetch potential matches (filtered by gender preferences)
    // Build gender filter - only show profiles whose gender matches what the user is interested in
    // AND whose interestedIn includes the current user's gender (mutual interest)
    const candidates = await db.query.profiles.findMany({
        where: and(
            notInArray(profiles.userId, excludedIds),
            eq(profiles.isVisible, true),
            eq(profiles.profileCompleted, true),
            // Filter: candidate's gender must be in user's target genders
            targetGenders.length > 0 
                ? inArray(profiles.gender, targetGenders)
                : undefined
        ),
        with: {
            user: true,
        },
        limit: limit + offset + 50, // Fetch more to account for mutual interest filtering
    });
    
    // Additional filter: Check if the candidate would also be interested in the current user
    // (mutual interest check for better matching)
    const filteredCandidates = candidates.filter(candidate => {
        const candidateInterestedIn = candidate.interestedIn as string[] | null;
        
        // If candidate has no preference set, check default behavior
        if (!candidateInterestedIn || candidateInterestedIn.length === 0) {
            // Default: opposite gender logic
            if (candidate.gender === 'male' && currentUserProfile.gender === 'female') return true;
            if (candidate.gender === 'female' && currentUserProfile.gender === 'male') return true;
            if (candidate.gender === 'other' || !candidate.gender) return true;
            if (!currentUserProfile.gender || currentUserProfile.gender === 'other') return true;
            return false;
        }
        
        // If candidate has preferences, check if current user's gender is included
        return currentUserProfile.gender 
            ? candidateInterestedIn.includes(currentUserProfile.gender)
            : true; // If current user has no gender set, show them anyway
    });

    // 4. Scoring Algorithm
    const scoredCandidates = filteredCandidates.map((candidate) => {
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

        // Vibe Matching (Major weight)
        if (vibe !== 'all') {
            const vibeKeywords: Record<string, string[]> = {
                music: ['Music', 'Concerts', 'Spotify', 'Guitar', 'Singing', 'Afrobeats', 'Hip Hop', 'Jazz'],
                hustle: ['Coding', 'Startups', 'Entrepreneurship', 'Business', 'Freelancing', 'Tech', 'AI'],
                chill: ['Coffee', 'Reading', 'Netflix', 'Relaxing', 'Sleep', 'Peace', 'Nature'],
                gaming: ['Gaming', 'PlayStation', 'Xbox', 'PC', 'E-sports', 'Twitch', 'Streaming'],
                night: ['Party', 'Clubbing', 'Late Night', 'Night Owl', 'Dancing', 'Midnight'],
                creative: ['Art', 'Design', 'Photography', 'Painting', 'Content Creation', 'Writing'],
            };

            const keywords = vibeKeywords[vibe] || [];
            const hasVibeMatch = (candidate.interests || []).some(interest =>
                keywords.some(k => interest.toLowerCase().includes(k.toLowerCase()))
            );

            if (hasVibeMatch) {
                score += 25; // Massive boost for vibe alignment
            }
        }

        return { ...candidate, score };
    });

    // 5. Sort and Shuffle
    // Sort by score desc
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Add a bit of randomness (shuffle top results slightly) to feel organic
    // For simplicity, we just return the sorted list for now, but you could 
    // shuffle the top 10.

    // Return paginated slice
    return scoredCandidates.slice(offset, offset + limit);
}
