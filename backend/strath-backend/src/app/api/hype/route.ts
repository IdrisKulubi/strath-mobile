/**
 * Hype Me — Main Route
 *
 * POST /api/hype          → Generate (or refresh) a unique invite link
 * GET  /api/hype?userId=  → Fetch approved vouches for a profile
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hypeInviteLinks, hypeVouches, session as sessionTable } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

// ─── Session helper ───────────────────────────────────────────────────────────

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

// ─── POST /api/hype — generate invite link ────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        // Invalidate any existing active link for this user
        await db
            .delete(hypeInviteLinks)
            .where(eq(hypeInviteLinks.profileUserId, userId));

        // Generate a cryptographically secure token
        const token = crypto.randomBytes(24).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const [link] = await db
            .insert(hypeInviteLinks)
            .values({
                profileUserId: userId,
                token,
                maxUses: 5,
                currentUses: 0,
                expiresAt,
            })
            .returning();

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.strathspace.com";

        return successResponse({
            token: link.token,
            url: `${baseUrl}/hype/write/${link.token}`,
            maxUses: link.maxUses,
            currentUses: link.currentUses,
            expiresAt: link.expiresAt,
        });
    } catch (error) {
        console.error("[POST /api/hype]", error);
        return errorResponse("Failed to generate invite link", 500);
    }
}

// ─── GET /api/hype — two modes ───────────────────────────────────────────────
//   ?userId=<id>  → public view: only approved, non-flagged vouches
//   (no param)    → own dashboard: all vouches + moderation state + active link

export async function GET(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const currentUserId = session.user.id;

        const { searchParams } = new URL(req.url);
        const targetUserId = searchParams.get("userId");
        const isOwnProfile = !targetUserId || targetUserId === currentUserId;

        if (isOwnProfile) {
            // ── Own dashboard: return ALL vouches (approved + hidden) ──────────
            const [allVouches, link] = await Promise.all([
                db.query.hypeVouches.findMany({
                    where: and(
                        eq(hypeVouches.profileUserId, currentUserId),
                        eq(hypeVouches.isFlagged, false),
                    ),
                    orderBy: (t, { desc }) => [desc(t.createdAt)],
                }),
                db.query.hypeInviteLinks.findFirst({
                    where: eq(hypeInviteLinks.profileUserId, currentUserId),
                }),
            ]);

            let activeLink = null;
            if (link && link.expiresAt > new Date() && (link.currentUses ?? 0) < (link.maxUses ?? 5)) {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.strathspace.com";
                activeLink = {
                    token: link.token,
                    url: `${baseUrl}/hype/write/${link.token}`,
                    maxUses: link.maxUses,
                    currentUses: link.currentUses,
                    expiresAt: link.expiresAt,
                };
            }

            return successResponse({
                vouches: allVouches.map((v) => ({
                    id: v.id,
                    authorName: v.authorName,
                    content: v.content,
                    isApproved: v.isApproved,
                    createdAt: v.createdAt,
                })),
                activeLink,
                total: allVouches.length,
            });
        }

        // ── Public view: only approved, non-flagged vouches ───────────────────
        const vouches = await db.query.hypeVouches.findMany({
            where: and(
                eq(hypeVouches.profileUserId, targetUserId),
                eq(hypeVouches.isApproved, true),
                eq(hypeVouches.isFlagged, false),
            ),
            orderBy: (t, { desc }) => [desc(t.createdAt)],
        });

        return successResponse({
            vouches: vouches.map((v) => ({
                id: v.id,
                authorName: v.authorName,
                content: v.content,
                createdAt: v.createdAt,
            })),
            activeLink: null,
            total: vouches.length,
        });
    } catch (error) {
        console.error("[GET /api/hype]", error);
        return errorResponse("Failed to fetch vouches", 500);
    }
}
