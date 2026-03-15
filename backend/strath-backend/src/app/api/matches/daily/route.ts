import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, swipes, blocks, dailyMatchSkips, dateRequests } from "@/db/schema";
import { eq, and, notInArray, inArray, gte, lt } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getTargetGenders, isReciprocalGenderMatch } from "@/lib/gender-preferences";
import { computeCompatibility } from "@/lib/services/compatibility-service";

export const dynamic = "force-dynamic";

async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const { session: sessionTable } = await import("@/db/schema");
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session;
}

/**
 * GET /api/matches/daily
 *
 * Returns top 4 daily matches for the authenticated user with compatibility
 * scores and reasons. Excludes already-matched, swiped, and blocked users.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const userId = session.user.id;

        const currentProfile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, userId),
        });

        if (!currentProfile) {
            return successResponse({ matches: [] });
        }

        const targetGenders = getTargetGenders(
            currentProfile.gender,
            currentProfile.interestedIn as string[] | null
        );

        const swipedIds = await db
            .select({ id: swipes.swipedId })
            .from(swipes)
            .where(eq(swipes.swiperId, userId));

        const outgoingDateRequestRows = await db
            .select({
                toUserId: dateRequests.toUserId,
                status: dateRequests.status,
            })
            .from(dateRequests)
            .where(eq(dateRequests.fromUserId, userId));

        const activeRequestStatuses = new Set(["pending", "accepted"]);
        const activeDateRequestTargets = new Set(
            outgoingDateRequestRows
                .filter((request) => activeRequestStatuses.has(request.status))
                .map((request) => request.toUserId)
        );

        const swipeExcludedIds = swipedIds
            .map((u) => u.id)
            .filter((id) => !activeDateRequestTargets.has(id));

        const blockedIds = await db
            .select({ id: blocks.blockedId })
            .from(blocks)
            .where(eq(blocks.blockerId, userId));

        const blockedByIds = await db
            .select({ id: blocks.blockerId })
            .from(blocks)
            .where(eq(blocks.blockedId, userId));

        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

        const todaySkips = await db
            .select({ id: dailyMatchSkips.skippedUserId })
            .from(dailyMatchSkips)
            .where(
                and(
                    eq(dailyMatchSkips.userId, userId),
                    gte(dailyMatchSkips.skippedAt, startOfToday),
                    lt(dailyMatchSkips.skippedAt, startOfTomorrow)
                )
            );

        const excludedIds = [
            userId,
            ...swipeExcludedIds,
            ...blockedIds.map((u) => u.id),
            ...blockedByIds.map((u) => u.id),
            ...todaySkips.map((s) => s.id),
        ];

        const candidateProfiles = await db.query.profiles.findMany({
            where: and(
                notInArray(profiles.userId, excludedIds),
                eq(profiles.isVisible, true),
                eq(profiles.profileCompleted, true),
                targetGenders.length > 0 ? inArray(profiles.gender, targetGenders) : undefined
            ),
            with: { user: true },
            limit: 20,
        });

        const reciprocal = candidateProfiles.filter((c) =>
            isReciprocalGenderMatch(
                currentProfile.gender,
                c.gender,
                c.interestedIn as string[] | null
            )
        );

        const scored = await Promise.all(
            reciprocal.map(async (candidate) => {
                const { score, reasons } = await computeCompatibility(userId, candidate.userId);
                const u = candidate.user;
                const interests = (candidate.interests as string[]) ?? [];
                const pa = candidate.personalityAnswers as Record<string, unknown> | null;
                const personalityTags: string[] = [];
                if (pa?.sleepSchedule) personalityTags.push(String(pa.sleepSchedule).replace(/_/g, " "));
                if (pa?.socialBattery) personalityTags.push(String(pa.socialBattery).replace(/_/g, " "));
                if (pa?.convoStyle) personalityTags.push(String(pa.convoStyle).replace(/_/g, " "));

                return {
                    userId: candidate.userId,
                    firstName: candidate.firstName || u?.name?.split(" ")[0] || "Unknown",
                    age: candidate.age ?? 0,
                    profilePhoto: candidate.profilePhoto ?? u?.profilePhoto ?? u?.image,
                    compatibilityScore: score,
                    reasons: reasons.length > 0 ? reasons : ["Potential match"],
                    bio: candidate.bio ?? candidate.aboutMe,
                    interests,
                    personalityTags,
                    course: candidate.course,
                    university: candidate.university,
                    requestSent: activeDateRequestTargets.has(candidate.userId),
                };
            })
        );

        scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
        const top4 = scored.slice(0, 4);

        return successResponse({ matches: top4 });
    } catch (error) {
        console.error("[matches/daily] Error:", error);
        return errorResponse(error);
    }
}
