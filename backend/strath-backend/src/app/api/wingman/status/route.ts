import { NextRequest } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { session as sessionTable, wingmanLinks, wingmanPacks } from "@/db/schema";

export const dynamic = "force-dynamic";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

async function getSession(req: NextRequest): Promise<AuthSession> {
    let session: AuthSession = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
        const authHeader = req.headers.get("authorization");
        const match = authHeader?.match(/^bearer\s+(.+)$/i);
        const token = match?.[1]?.trim();
        if (token) {
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

        // If the Wingman tables haven't been migrated yet, fail fast with a clear message.
        const reg = await db.execute(sql`select to_regclass('public.wingman_links') as t`);
        const tableName = (reg.rows?.[0] as { t?: string | null } | undefined)?.t ?? null;
        if (!tableName) {
            return errorResponse("Wingman is not enabled on this server yet. Please run the latest DB migrations.", 501);
        }

        const activeLink = await db.query.wingmanLinks.findFirst({
            where: and(eq(wingmanLinks.profileUserId, userId), gt(wingmanLinks.expiresAt, new Date())),
            orderBy: (t, { desc }) => [desc(t.createdAt)],
        });

        const latestPack = await db.query.wingmanPacks.findFirst({
            where: eq(wingmanPacks.profileUserId, userId),
            orderBy: (t, { desc }) => [desc(t.generatedAt)],
            columns: {
                id: true,
                roundNumber: true,
                generatedAt: true,
                openedAt: true,
            },
        });

        const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
        const baseUrl = configuredAppUrl && new URL(configuredAppUrl).origin === req.nextUrl.origin
            ? configuredAppUrl
            : req.nextUrl.origin;

        return successResponse({
            activeLink: activeLink
                ? {
                      roundNumber: activeLink.roundNumber,
                      token: activeLink.token,
                      url: `${baseUrl}/wingman/${activeLink.token}`,
                      targetSubmissions: activeLink.targetSubmissions ?? 3,
                      currentSubmissions: activeLink.currentSubmissions ?? 0,
                      expiresAt: activeLink.expiresAt,
                      status: activeLink.status,
                      lastSubmissionAt: activeLink.lastSubmissionAt,
                  }
                : null,
            latestPack: latestPack ?? null,
        });
    } catch (error) {
        console.error("[GET /api/wingman/status]", error);
        return errorResponse("Failed to load wingman status", 500);
    }
}
