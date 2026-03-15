/**
 * Compatibility scoring service
 *
 * Weights (per design doc):
 * - Interest overlap: 25%
 * - Personality alignment: 25%
 * - Lifestyle similarity: 20%
 * - Communication style: 15%
 * - Wingman feedback: 15% (placeholder for now)
 */

import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface CompatibilityResult {
    score: number;
    reasons: string[];
}

type ProfileRow = typeof profiles.$inferSelect;

function getInterests(p: ProfileRow | null | undefined): string[] {
    const arr = p?.interests;
    return Array.isArray(arr) ? arr : [];
}

function getPersonality(p: ProfileRow | null | undefined) {
    const pa = p?.personalityAnswers as Record<string, unknown> | null;
    return pa ?? {};
}

function getLifestyle(p: ProfileRow | null | undefined) {
    const la = p?.lifestyleAnswers as Record<string, unknown> | null;
    return la ?? {};
}

// Interest overlap: 0–100
function scoreInterests(mine: string[], theirs: string[]): { score: number; reasons: string[] } {
    if (mine.length === 0 || theirs.length === 0) {
        return { score: 50, reasons: [] };
    }
    const overlap = mine.filter((i) => theirs.includes(i));
    const score = Math.round(50 + (overlap.length / Math.max(mine.length, theirs.length)) * 50);
    const reasons = overlap.slice(0, 3).map((i) => i);
    return { score, reasons };
}

// Personality alignment: same sleep, social vibe, convo style, social battery, ideal date
function scorePersonality(
    myP: Record<string, unknown>,
    theirP: Record<string, unknown>
): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let matches = 0;
    let total = 0;

    const keys = ["sleepSchedule", "socialVibe", "convoStyle", "socialBattery", "idealDateVibe"] as const;
    const labels: Record<string, string> = {
        sleepSchedule: "Similar sleep rhythm",
        socialVibe: "Similar weekend energy",
        convoStyle: "Compatible conversation style",
        socialBattery: "Similar social energy",
        idealDateVibe: "Same ideal first date",
    };

    for (const k of keys) {
        const a = myP[k];
        const b = theirP[k];
        if (a && b) {
            total++;
            if (a === b) {
                matches++;
                reasons.push(labels[k] ?? k);
            }
        }
    }

    const score = total === 0 ? 50 : Math.round(50 + (matches / total) * 50);
    return { score, reasons: reasons.slice(0, 3) };
}

// Lifestyle: relationship goal, outing frequency, drinks, smokes
function scoreLifestyle(
    myL: Record<string, unknown>,
    theirL: Record<string, unknown>
): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let matches = 0;
    let total = 0;

    const keys = ["relationshipGoal", "outingFrequency", "drinks", "smokes"] as const;
    const labels: Record<string, string> = {
        relationshipGoal: "Similar relationship goals",
        outingFrequency: "Similar social frequency",
        drinks: "Compatible drinking preference",
        smokes: "Compatible smoking preference",
    };

    for (const k of keys) {
        const a = myL[k];
        const b = theirL[k];
        if (a && b) {
            total++;
            if (a === b) {
                matches++;
                reasons.push(labels[k] ?? k);
            }
        }
    }

    const score = total === 0 ? 50 : Math.round(50 + (matches / total) * 50);
    return { score, reasons: reasons.slice(0, 2) };
}

// Communication style: existing profile field
function scoreCommunication(myStyle: string | null, theirStyle: string | null): number {
    if (!myStyle || !theirStyle) return 50;
    if (myStyle === theirStyle) return 100;
    if (myStyle === "both" || theirStyle === "both") return 75;
    return 40;
}

// Wingman: placeholder — no structured wingman data in schema yet
function scoreWingman(_myUserId: string, _theirUserId: string): number {
    return 50;
}

/**
 * Compute compatibility between two users.
 */
export async function computeCompatibility(
    myUserId: string,
    theirUserId: string
): Promise<CompatibilityResult> {
    const [myProfile, theirProfile] = await Promise.all([
        db.query.profiles.findFirst({ where: eq(profiles.userId, myUserId) }),
        db.query.profiles.findFirst({ where: eq(profiles.userId, theirUserId) }),
    ]);

    const myInterests = getInterests(myProfile);
    const theirInterests = getInterests(theirProfile);
    const intResult = scoreInterests(myInterests, theirInterests);

    const myPersonality = getPersonality(myProfile);
    const theirPersonality = getPersonality(theirProfile);
    const persResult = scorePersonality(myPersonality, theirPersonality);

    const myLifestyle = getLifestyle(myProfile);
    const theirLifestyle = getLifestyle(theirProfile);
    const lifeResult = scoreLifestyle(myLifestyle, theirLifestyle);

    const commScore = scoreCommunication(
        myProfile?.communicationStyle ?? null,
        theirProfile?.communicationStyle ?? null
    );

    const wingScore = scoreWingman(myUserId, theirUserId);

    const weighted =
        intResult.score * 0.25 +
        persResult.score * 0.25 +
        lifeResult.score * 0.2 +
        commScore * 0.15 +
        wingScore * 0.15;

    const score = Math.round(Math.min(100, Math.max(0, weighted)));

    const reasons = [
        ...intResult.reasons,
        ...persResult.reasons,
        ...lifeResult.reasons,
    ].slice(0, 4);

    // Fallback reasons if none from scoring
    if (reasons.length === 0) {
        if (myInterests.length > 0 && theirInterests.length > 0) {
            reasons.push("Shared interests");
        }
        if (myProfile?.university && theirProfile?.university && myProfile.university === theirProfile.university) {
            reasons.push("Same university");
        }
        if (reasons.length === 0) {
            reasons.push("Potential match");
        }
    }

    return { score, reasons };
}
