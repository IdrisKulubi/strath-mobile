import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { session as sessionTable, wingmanPacks } from "@/db/schema";

export const dynamic = "force-dynamic";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

async function getSession(req: NextRequest): Promise<AuthSession> {
    let session: AuthSession = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as unknown as AuthSession;
            }
        }
    }

    return session;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const limit = Math.min(5, Math.max(1, Number(searchParams.get("limit") ?? "5")));

        const packs = await db.query.wingmanPacks.findMany({
            where: eq(wingmanPacks.profileUserId, userId),
            orderBy: (t, { desc }) => [desc(t.generatedAt)],
            limit,
            columns: {
                id: true,
                roundNumber: true,
                compiledSummary: true,
                generatedAt: true,
                openedAt: true,
            },
        });

        return successResponse({ packs });
    } catch (error) {
        console.error("[GET /api/wingman/history]", error);
        return errorResponse("Failed to load wingman history", 500);
    }
}
