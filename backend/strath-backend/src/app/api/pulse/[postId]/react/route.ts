/**
 * Pulse Reaction Toggle API
 *
 * POST /api/pulse/[postId]/react
 * Body: { reaction: "fire" | "skull" | "heart" }
 *
 * Toggles the reaction on/off for the authenticated user.
 * Switching reaction type replaces the old one.
 */
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { pulsePosts, session as sessionTable } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import { toggleReaction } from "@/lib/services/pulse-service";

export const dynamic = "force-dynamic";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

// ─── Session helper ───────────────────────────────────────────────────────────

async function getSession(req: NextRequest) {
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

// ─── Schema ───────────────────────────────────────────────────────────────────

const reactSchema = z.object({
    reaction: z.enum(["fire", "skull", "heart"]),
});

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        const { postId } = await params;

        // Verify post exists and is not hidden/expired
        const post = await db.query.pulsePosts.findFirst({
            where: eq(pulsePosts.id, postId),
            columns: { isHidden: true, expiresAt: true },
        });

        if (!post || post.isHidden) return errorResponse("Post not found", 404);
        if (post.expiresAt && post.expiresAt < new Date()) {
            return errorResponse("Post has expired", 410);
        }

        const body = await req.json();
        const parsed = reactSchema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error, 400);

        const { reaction } = parsed.data;
        const result = await toggleReaction(postId, userId, reaction);

        return successResponse({
            added: result.added,
            reaction,
            counts: result.counts,
        });
    } catch (error) {
        console.error("POST /api/pulse/[postId]/react error:", error);
        return errorResponse("Failed to toggle reaction", 500);
    }
}
