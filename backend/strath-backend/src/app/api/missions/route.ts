import { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { matches, matchMissions, session as sessionTable } from "@/db/schema";
import {
    ensureMissionForMatch,
    refreshMissionExpiry,
    setMissionRating,
    setMissionState,
    suggestOtherMission,
    type MissionRating,
    type MissionType,
} from "@/lib/services/mission-service";

export const dynamic = "force-dynamic";

type SessionWithUser = { user: { id: string } };

async function getSessionWithFallback(req: NextRequest): Promise<SessionWithUser | null> {
    let session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });

            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }

    if (!session?.user?.id) return null;
    return { user: { id: session.user.id } };
}

function formatMission(mission: any) {
    return {
        id: mission.id,
        matchId: mission.matchId,
        missionType: mission.missionType,
        title: mission.title,
        description: mission.description,
        emoji: mission.emoji,
        suggestedLocation: mission.suggestedLocation,
        suggestedTime: mission.suggestedTime,
        deadline: mission.deadline?.toISOString?.() ?? null,
        user1Accepted: mission.user1Accepted,
        user2Accepted: mission.user2Accepted,
        user1Completed: mission.user1Completed,
        user2Completed: mission.user2Completed,
        status: mission.status,
        user1Rating: mission.user1Rating,
        user2Rating: mission.user2Rating,
        createdAt: mission.createdAt?.toISOString?.() ?? null,
        updatedAt: mission.updatedAt?.toISOString?.() ?? null,
    };
}

function formatMissionForViewer(params: {
    mission: any;
    match: { user1Id: string; user2Id: string };
    viewerId: string;
}) {
    const base = formatMission(params.mission);
    const isUser1 = params.match.user1Id === params.viewerId;
    const viewerAccepted = isUser1 ? params.mission.user1Accepted : params.mission.user2Accepted;
    const viewerCompleted = isUser1 ? params.mission.user1Completed : params.mission.user2Completed;
    const viewerRating = isUser1 ? params.mission.user1Rating : params.mission.user2Rating;
    const partnerAccepted = isUser1 ? params.mission.user2Accepted : params.mission.user1Accepted;
    const partnerCompleted = isUser1 ? params.mission.user2Completed : params.mission.user1Completed;
    const partnerRating = isUser1 ? params.mission.user2Rating : params.mission.user1Rating;

    return {
        ...base,
        viewerAccepted,
        viewerCompleted,
        viewerRating,
        partnerAccepted,
        partnerCompleted,
        partnerRating,
    };
}

// GET /api/missions?matchId=...  -> latest mission for a match
// GET /api/missions             -> latest mission per match for the current user
export async function GET(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const matchId = searchParams.get("matchId");

        if (matchId) {
            const match = await db.query.matches.findFirst({
                where: and(
                    eq(matches.id, matchId),
                    or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
                ),
            });
            if (!match) return errorResponse("Match not found", 404);

            const mission = await ensureMissionForMatch(matchId);
            const fresh = await refreshMissionExpiry(mission.id);
            return successResponse({
                mission: fresh ? formatMissionForViewer({ mission: fresh, match, viewerId: userId }) : null,
            });
        }

        // Latest mission per match for this user
        const userMatches = await db.query.matches.findMany({
            where: or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
            orderBy: [desc(matches.createdAt)],
            limit: 200,
        });

        const missions = await Promise.all(
            userMatches.map(async (m) => {
                try {
                    const mission = await ensureMissionForMatch(m.id);
                    const fresh = await refreshMissionExpiry(mission.id);
                    return fresh
                        ? formatMissionForViewer({ mission: fresh, match: m, viewerId: userId })
                        : null;
                } catch {
                    return null;
                }
            })
        );

        return successResponse({ missions: missions.filter(Boolean) });
    } catch (error) {
        return errorResponse(error);
    }
}

const PostBodySchema = z.object({
    matchId: z.string().min(1),
    action: z.enum(["accept", "complete", "suggest_other"]),
    excludeTypes: z
        .array(
            z.enum([
                "coffee_meetup",
                "song_exchange",
                "photo_challenge",
                "study_date",
                "campus_walk",
                "food_adventure",
                "sunset_spot",
                "quiz_challenge",
            ])
        )
        .optional(),
});

// POST /api/missions
// - accept / complete (updates flags + status)
// - suggest_other (skips latest + creates a new one)
export async function POST(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);

        const body = PostBodySchema.parse(await request.json());
        const userId = session.user.id;

        // Ensure user is in match
        const match = await db.query.matches.findFirst({
            where: and(
                eq(matches.id, body.matchId),
                or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
            ),
        });
        if (!match) return errorResponse("Match not found", 404);

        if (body.action === "suggest_other") {
            const mission = await suggestOtherMission({
                matchId: body.matchId,
                excludeTypes: body.excludeTypes as MissionType[] | undefined,
            });
            return successResponse({
                mission: formatMissionForViewer({ mission, match, viewerId: userId }),
            });
        }

        const mission = await setMissionState({
            matchId: body.matchId,
            userId,
            action: body.action,
        });

        const fresh = await refreshMissionExpiry(mission.id);
        return successResponse({
            mission: fresh
                ? formatMissionForViewer({ mission: fresh, match, viewerId: userId })
                : formatMissionForViewer({ mission, match, viewerId: userId }),
        });
    } catch (error) {
        return errorResponse(error);
    }
}

const PatchBodySchema = z.object({
    matchId: z.string().min(1),
    rating: z.enum(["amazing", "nice", "meh", "not_for_me"]),
});

// PATCH /api/missions -> submit post-mission rating
export async function PATCH(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);

        const body = PatchBodySchema.parse(await request.json());
        const userId = session.user.id;

        const mission = await setMissionRating({
            matchId: body.matchId,
            userId,
            rating: body.rating as MissionRating,
        });

        const match = await db.query.matches.findFirst({
            where: and(
                eq(matches.id, body.matchId),
                or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
            ),
        });
        if (!match) return errorResponse("Match not found", 404);

        const fresh = await refreshMissionExpiry(mission.id);
        return successResponse({
            mission: fresh
                ? formatMissionForViewer({ mission: fresh, match, viewerId: userId })
                : formatMissionForViewer({ mission, match, viewerId: userId }),
        });
    } catch (error) {
        return errorResponse(error);
    }
}
