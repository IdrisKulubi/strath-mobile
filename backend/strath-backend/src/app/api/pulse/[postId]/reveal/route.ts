/**
 * Pulse Reveal API
 *
 * POST /api/pulse/[postId]/reveal
 *
 * A user "knocks" on an anonymous post — if the post author has also
 * previously knocked on the requester's domain (tracked via revealRequests),
 * a mutual reveal is triggered and both real profiles are returned.
 *
 * GET /api/pulse/[postId]/reveal
 *   → Returns whether the viewer has requested reveal + mutual status.
 */
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { pulsePosts, user as userTable, session as sessionTable } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requestReveal, getRevealProfile } from "@/lib/services/pulse-service";
import { sendPushNotification } from "@/lib/notifications";

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

// ─── GET /api/pulse/[postId]/reveal ──────────────────────────────────────────

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const viewerId = session.user.id;

        const { postId } = await params;

        const post = await db.query.pulsePosts.findFirst({
            where: eq(pulsePosts.id, postId),
            columns: { revealRequests: true, isAnonymous: true, authorId: true },
        });

        if (!post) return errorResponse("Post not found", 404);

        const revealRequests: string[] = post.revealRequests ?? [];
        const viewerRequested = revealRequests.includes(viewerId);
        const mutual = viewerRequested && revealRequests.includes(post.authorId);

        return successResponse({
            viewerRequested,
            revealCount: revealRequests.length,
            mutual,
            // Only expose identity if truly mutual
            authorProfile: mutual ? await getRevealProfile(post.authorId) : null,
        });
    } catch (error) {
        console.error("GET /api/pulse/[postId]/reveal error:", error);
        return errorResponse("Failed to fetch reveal status", 500);
    }
}

// ─── POST /api/pulse/[postId]/reveal ─────────────────────────────────────────

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const requesterId = session.user.id;

        const { postId } = await params;

        const post = await db.query.pulsePosts.findFirst({
            where: eq(pulsePosts.id, postId),
            columns: { isHidden: true, expiresAt: true, isAnonymous: true },
        });

        if (!post || post.isHidden) return errorResponse("Post not found", 404);
        if (!post.isAnonymous) return errorResponse("Post is not anonymous", 400);
        if (post.expiresAt && post.expiresAt < new Date()) {
            return errorResponse("Post has expired", 410);
        }

        const result = await requestReveal(postId, requesterId);

        // Notify the post author (non-blocking)
        if (!result.mutual) {
            // Author gets notified that someone wants to reveal
            const author = await db.query.user.findFirst({
                where: eq(userTable.id, result.authorId),
                columns: { pushToken: true },
            });
            if (author?.pushToken) {
                sendPushNotification(
                    author.pushToken,
                    "Someone saw your Pulse post and wants to reveal. Tap to respond.",
                    { screen: "pulse", postId }
                ).catch(() => {});
            }
        }

        // Return mutual reveal profiles if both agreed
        const requesterProfile = result.mutual
            ? await getRevealProfile(requesterId)
            : null;
        const authorProfile = result.mutual
            ? await getRevealProfile(result.authorId)
            : null;

        return successResponse({
            requested: true,
            mutual: result.mutual,
            revealCount: result.revealRequests.length,
            // Only expose identity data when mutual
            requesterProfile,
            authorProfile,
        });
    } catch (error: unknown) {
        console.error("POST /api/pulse/[postId]/reveal error:", error);
        if (error instanceof Error && error.message) return errorResponse(error.message, 400);
        return errorResponse("Failed to request reveal", 500);
    }
}
