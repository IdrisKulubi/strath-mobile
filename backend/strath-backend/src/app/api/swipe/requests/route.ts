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

export type SwipeRequest = {
    requestId: string;
    createdAt: string;
    fromUser: {
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
 * GET /api/swipe/requests
 *
 * Incoming "likes" that the current user has NOT responded to yet.
 * This is required when you remove the swipe UI — users need an inbox
 * to accept/decline connection requests.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const userId = session.user.id;

        // 1) All incoming likes
        const incomingLikes = await db.query.swipes.findMany({
            where: and(eq(swipes.swipedId, userId), eq(swipes.isLike, true)),
            orderBy: [desc(swipes.createdAt)],
            limit: 50,
            with: {
                swiper: {
                    with: {
                        profile: true,
                    },
                },
            },
        });

        if (incomingLikes.length === 0) {
            return successResponse({ requests: [] as SwipeRequest[] });
        }

        const swiperIds = Array.from(new Set(incomingLikes.map((s) => s.swiperId)));

        // 2) Exclude anyone already matched with me
        const existingMatches = await db.query.matches.findMany({
            where: or(
                and(eq(matches.user1Id, userId), inArray(matches.user2Id, swiperIds)),
                and(eq(matches.user2Id, userId), inArray(matches.user1Id, swiperIds))
            ),
            columns: { user1Id: true, user2Id: true },
            limit: 200,
        });

        const matchedPartnerIds = new Set<string>();
        for (const m of existingMatches) {
            const partnerId = m.user1Id === userId ? m.user2Id : m.user1Id;
            matchedPartnerIds.add(partnerId);
        }

        // 3) Exclude anyone I already swiped on (accept/decline already happened)
        const myResponses = await db.query.swipes.findMany({
            where: and(eq(swipes.swiperId, userId), inArray(swipes.swipedId, swiperIds)),
            columns: { swipedId: true },
            limit: 200,
        });

        const respondedIds = new Set(myResponses.map((r) => r.swipedId));

        const requests: SwipeRequest[] = incomingLikes
            .filter((s) => !matchedPartnerIds.has(s.swiperId))
            .filter((s) => !respondedIds.has(s.swiperId))
            .map((s) => ({
                requestId: s.id,
                createdAt: s.createdAt.toISOString(),
                fromUser: {
                    id: s.swiper.id,
                    name: s.swiper.name,
                    image: s.swiper.image ?? null,
                    profilePhoto: s.swiper.profilePhoto ?? null,
                    profile: s.swiper.profile
                        ? {
                              course: s.swiper.profile.course ?? null,
                              yearOfStudy: s.swiper.profile.yearOfStudy ?? null,
                              university: s.swiper.profile.university ?? null,
                              photos: (s.swiper.profile.photos as string[] | null) ?? null,
                          }
                        : null,
                },
            }));

        return successResponse({ requests });
    } catch (error) {
        console.error("[SwipeRequests] Error:", error);
        return errorResponse("Failed to fetch connection requests", 500);
    }
}
