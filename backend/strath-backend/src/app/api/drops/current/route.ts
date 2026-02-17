import { NextRequest } from "next/server";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, session as sessionTable, weeklyDrops } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { AuthSession } from "@/types/auth";

async function getSessionWithFallback(req: NextRequest) {
    let session: AuthSession = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });

            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as AuthSession;
            }
        }
    }

    return session;
}

export async function GET(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const userId = session.user.id;
        const now = new Date();

        const currentDrop = await db.query.weeklyDrops.findFirst({
            where: and(
                eq(weeklyDrops.userId, userId),
                gte(weeklyDrops.expiresAt, now),
            ),
            orderBy: [desc(weeklyDrops.createdAt)],
        });

        if (!currentDrop) {
            return successResponse({ drop: null });
        }

        const shouldMarkOpened = !currentDrop.openedAt;
        let openedAt = currentDrop.openedAt;

        if (shouldMarkOpened) {
            openedAt = now;
            await db
                .update(weeklyDrops)
                .set({
                    openedAt,
                    status: "opened",
                })
                .where(eq(weeklyDrops.id, currentDrop.id));
        }

        const profileRows = currentDrop.matchedUserIds.length
            ? await db.query.profiles.findMany({
                where: inArray(profiles.userId, currentDrop.matchedUserIds),
            })
            : [];

        const profileMap = new Map(profileRows.map((profile) => [profile.userId, profile]));

        const matches = currentDrop.matchData.map((item) => {
            const profile = profileMap.get(item.userId);
            return {
                userId: item.userId,
                score: item.score,
                reasons: item.reasons,
                starters: item.starters,
                profile: profile
                    ? {
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        age: profile.age,
                        course: profile.course,
                        yearOfStudy: profile.yearOfStudy,
                        profilePhoto: profile.profilePhoto,
                        photos: profile.photos,
                    }
                    : null,
            };
        });

        const remainingSeconds = Math.max(
            0,
            Math.floor((new Date(currentDrop.expiresAt).getTime() - now.getTime()) / 1000),
        );

        return successResponse({
            drop: {
                id: currentDrop.id,
                dropNumber: currentDrop.dropNumber,
                status: shouldMarkOpened ? "opened" : currentDrop.status,
                deliveredAt: currentDrop.deliveredAt,
                openedAt,
                expiresAt: currentDrop.expiresAt,
                remainingSeconds,
                matchCount: currentDrop.matchData.length,
                matches,
                justOpened: shouldMarkOpened,
            },
        });
    } catch (error) {
        console.error("[GET /api/drops/current] Error:", error);
        return errorResponse("Failed to fetch current weekly drop", 500);
    }
}
