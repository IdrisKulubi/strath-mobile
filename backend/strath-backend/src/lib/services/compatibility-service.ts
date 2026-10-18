/**
 * Compatibility scoring service
 *
 * This wraps the shared profile-pair ranking engine so discover,
 * daily candidate pairs, and compatibility previews all rely on
 * the same scoring model.
 */

import { selectProfilesForCompatibility } from "@/lib/db/queries/profiles";
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
    const results = await computeCompatibilityMany(myUserId, [theirUserId]);
    return results.get(theirUserId) ?? { score: 0, reasons: ["Incomplete profile data"] };
}

export async function computeCompatibilityMany(
    viewerUserId: string,
    targetUserIds: string[],
): Promise<Map<string, CompatibilityResult>> {
    const uniqueTargetIds = [...new Set(targetUserIds.filter(Boolean))];
    const profileMap = await selectProfilesForCompatibility([viewerUserId, ...uniqueTargetIds]);
    const viewerProfile = profileMap.get(viewerUserId);
    const results = new Map<string, CompatibilityResult>();

    for (const targetUserId of uniqueTargetIds) {
        const targetProfile = profileMap.get(targetUserId);
        if (!viewerProfile || !targetProfile) {
            results.set(targetUserId, { score: 0, reasons: ["Incomplete profile data"] });
            continue;
        }

        const ranked = scoreProfilePair(viewerProfile, targetProfile);
        results.set(targetUserId, {
            score: ranked.score,
            reasons: ranked.reasons,
        });
    }

    return results;
}
