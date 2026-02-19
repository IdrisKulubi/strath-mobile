import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches, session as sessionTable, swipes } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import { and, desc, eq, inArray, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getSessionWithFallback(req: NextRequest) {
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

    return session;
}

export type SentSwipe = {
    swipeId: string;
    createdAt: string;
    toUser: {
        id: string;
        name: string;
        image: string | null;
        profilePhoto: string | null;
        profile: {
            course: string | null;
            yearOfStudy: number | null;
            university: string | null;
            photos: string[] | null;
        } | null;
    };
};

/**
 * GET /api/swipe/sent
 *
 * Outgoing likes that haven't turned into a match yet.
 * This answers: "I sent connections — where do I see them?"
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const userId = session.user.id;

        // 1) My outgoing likes
        const outgoingLikes = await db.query.swipes.findMany({
            where: and(eq(swipes.swiperId, userId), eq(swipes.isLike, true)),
            orderBy: [desc(swipes.createdAt)],
            limit: 50,
            with: {
                swiped: {
                    with: {
                        profile: true,
                    },
                },
            },
        });

        if (outgoingLikes.length === 0) {
            return successResponse({ sent: [] as SentSwipe[] });
        }

        const targetIds = Array.from(new Set(outgoingLikes.map((s) => s.swipedId)));

        // 2) Exclude already-matched users
        const existingMatches = await db.query.matches.findMany({
            where: or(
                and(eq(matches.user1Id, userId), inArray(matches.user2Id, targetIds)),
                and(eq(matches.user2Id, userId), inArray(matches.user1Id, targetIds))
            ),
            columns: { user1Id: true, user2Id: true },
            limit: 200,
        });

        const matchedPartnerIds = new Set<string>();
        for (const m of existingMatches) {
            const partnerId = m.user1Id === userId ? m.user2Id : m.user1Id;
            matchedPartnerIds.add(partnerId);
        }

        // 3) Exclude targets that already responded (like or pass)
        const theirResponses = await db.query.swipes.findMany({
            where: and(inArray(swipes.swiperId, targetIds), eq(swipes.swipedId, userId)),
            columns: { swiperId: true },
            limit: 200,
        });

        const respondedByIds = new Set(theirResponses.map((r) => r.swiperId));

        const sent: SentSwipe[] = outgoingLikes
            .filter((s) => !matchedPartnerIds.has(s.swipedId))
            .filter((s) => !respondedByIds.has(s.swipedId))
            .map((s) => ({
                swipeId: s.id,
                createdAt: s.createdAt.toISOString(),
                toUser: {
                    id: s.swiped.id,
                    name: s.swiped.name,
                    image: s.swiped.image ?? null,
                    profilePhoto: s.swiped.profilePhoto ?? null,
                    profile: s.swiped.profile
                        ? {
                              course: s.swiped.profile.course ?? null,
                              yearOfStudy: s.swiped.profile.yearOfStudy ?? null,
                              university: s.swiped.profile.university ?? null,
                              photos: (s.swiped.profile.photos as string[] | null) ?? null,
                          }
                        : null,
                },
            }));

        return successResponse({ sent });
    } catch (error) {
        console.error("[SwipeSent] Error:", error);
        return errorResponse("Failed to fetch sent connections", 500);
    }
}
