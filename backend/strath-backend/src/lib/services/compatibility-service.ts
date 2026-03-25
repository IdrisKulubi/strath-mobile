/**
 * Compatibility scoring service
 *
 * This wraps the shared profile-pair ranking engine so discover,
 * daily candidate pairs, and compatibility previews all rely on
 * the same scoring model.
 */

import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scoreProfilePair } from "@/lib/services/match-ranking";

export interface CompatibilityResult {
    score: number;
    reasons: string[];
}

/**
 * Compute compatibility between two users.
 */
export async function computeCompatibility(
    myUserId: string,
    theirUserId: string,
): Promise<CompatibilityResult> {
    const [myProfile, theirProfile] = await Promise.all([
        db.query.profiles.findFirst({ where: eq(profiles.userId, myUserId) }),
        db.query.profiles.findFirst({ where: eq(profiles.userId, theirUserId) }),
    ]);

    if (!myProfile || !theirProfile) {
        return { score: 0, reasons: ["Incomplete profile data"] };
    }

    const ranked = scoreProfilePair(myProfile, theirProfile);
    return {
        score: ranked.score,
        reasons: ranked.reasons,
    };
}
