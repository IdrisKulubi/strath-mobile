import { NextRequest } from "next/server";
import { and, desc, eq, inArray, lt, ne } from "drizzle-orm";
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

        const now = new Date();
        const userId = session.user.id;

        await db
            .update(weeklyDrops)
            .set({ status: "expired" })
            .where(and(
                eq(weeklyDrops.userId, userId),
                lt(weeklyDrops.expiresAt, now),
                ne(weeklyDrops.status, "expired"),
            ));

        const historyRows = await db.query.weeklyDrops.findMany({
            where: and(
                eq(weeklyDrops.userId, userId),
                lt(weeklyDrops.expiresAt, now),
            ),
            orderBy: [desc(weeklyDrops.createdAt)],
            limit: 20,
        });

        const previewIds = Array.from(new Set(
            historyRows.flatMap((drop) => drop.matchedUserIds.slice(0, 3)),
        ));

        const previewProfiles = previewIds.length
            ? await db.query.profiles.findMany({
                where: inArray(profiles.userId, previewIds),
            })
            : [];

        const profileMap = new Map(previewProfiles.map((profile) => [profile.userId, profile]));

        const history = historyRows.map((drop) => {
            const previews = drop.matchedUserIds.slice(0, 3).map((id) => {
                const profile = profileMap.get(id);
                return {
                    userId: id,
                    firstName: profile?.firstName || null,
                    profilePhoto: profile?.profilePhoto || null,
                    photos: profile?.photos || null,
                };
            });

            return {
                id: drop.id,
                dropNumber: drop.dropNumber,
                status: drop.status,
                createdAt: drop.createdAt,
                deliveredAt: drop.deliveredAt,
                openedAt: drop.openedAt,
                expiresAt: drop.expiresAt,
                matchCount: drop.matchData.length,
                previews,
            };
        });

        return successResponse({ history });
    } catch (error) {
        console.error("[GET /api/drops/history] Error:", error);
        return errorResponse("Failed to fetch weekly drop history", 500);
    }
}
