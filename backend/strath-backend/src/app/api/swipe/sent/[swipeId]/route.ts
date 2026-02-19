import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { session as sessionTable, swipes } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";

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

/**
 * DELETE /api/swipe/sent/:swipeId
 *
 * Cancel an outgoing (pending) swipe/like.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ swipeId: string }> }) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const { swipeId } = await Promise.resolve(params);
        if (!swipeId) {
            return errorResponse("Missing swipeId", 400);
        }

        const userId = session.user.id;

        const existing = await db.query.swipes.findFirst({
            where: and(eq(swipes.id, swipeId), eq(swipes.swiperId, userId)),
            columns: { id: true },
        });

        if (!existing) {
            return errorResponse("Not found", 404);
        }

        await db.delete(swipes).where(and(eq(swipes.id, swipeId), eq(swipes.swiperId, userId)));

        return successResponse({ deleted: true });
    } catch (error) {
        console.error("[SwipeSentCancel] Error:", error);
        return errorResponse("Failed to cancel request", 500);
    }
}
