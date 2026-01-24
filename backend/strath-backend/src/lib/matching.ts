import { db } from "./db";
import { profiles, swipes, blocks } from "../db/schema";
import { eq, and, notInArray, inArray, or } from "drizzle-orm";

/**
 * Convert lookingFor string to interestedIn array
 * This handles legacy users who have lookingFor but not interestedIn set
 */
function lookingForToInterestedIn(lookingFor: string | null): string[] | null {
    if (!lookingFor) return null;
    switch (lookingFor) {
        case 'women':
            return ['female'];
        case 'men':
            return ['male'];
        case 'everyone':
            return ['male', 'female', 'other'];
        default:
            return null;
    }
}

/**
 * Get the genders a user wants to see based on their interestedIn preference.
 * Falls back to lookingFor if interestedIn not set, then defaults to opposite gender.
 */
function getTargetGenders(userGender: string | null, interestedIn: string[] | null, lookingFor: string | null = null): string[] {
    // If user explicitly set their preferences, use those
    if (interestedIn && interestedIn.length > 0) {
        return interestedIn;
    }
    
    // Fallback: derive from lookingFor if set (for legacy users)
    const derivedFromLookingFor = lookingForToInterestedIn(lookingFor);
    if (derivedFromLookingFor && derivedFromLookingFor.length > 0) {
        return derivedFromLookingFor;
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

    console.log('[Matching] User ID:', userId);
    console.log('[Matching] Current user profile:', currentUserProfile ? {
        gender: currentUserProfile.gender,
        interestedIn: currentUserProfile.interestedIn,
        lookingFor: currentUserProfile.lookingFor,
        isVisible: currentUserProfile.isVisible,
        profileCompleted: currentUserProfile.profileCompleted,
    } : 'NOT FOUND');

    if (!currentUserProfile) return [];
    
    // Get target genders based on user's preferences (with lookingFor fallback)
    const targetGenders = getTargetGenders(
        currentUserProfile.gender,
        currentUserProfile.interestedIn as string[] | null,
        currentUserProfile.lookingFor
    );
    
    console.log('[Matching] Target genders to search for:', targetGenders);

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
    
    console.log('[Matching] Candidates found (after DB query):', candidates.length);
    console.log('[Matching] Candidate details:', candidates.map(c => ({
        userId: c.userId,
        gender: c.gender,
        interestedIn: c.interestedIn,
        lookingFor: c.lookingFor,
        isVisible: c.isVisible,
        profileCompleted: c.profileCompleted,
    })));
    
    // Additional filter: Check if the candidate would also be interested in the current user
    // (mutual interest check for better matching)
    const filteredCandidates = candidates.filter(candidate => {
        // Get candidate's interested in - either from interestedIn array or derived from lookingFor
        let candidateInterestedIn = candidate.interestedIn as string[] | null;
        
        // If no interestedIn, try to derive from lookingFor
        if (!candidateInterestedIn || candidateInterestedIn.length === 0) {
            candidateInterestedIn = lookingForToInterestedIn(candidate.lookingFor);
        }
        
        // If still no preference set, use default opposite gender logic
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

    console.log('[Matching] Filtered candidates (after mutual interest):', filteredCandidates.length);

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
