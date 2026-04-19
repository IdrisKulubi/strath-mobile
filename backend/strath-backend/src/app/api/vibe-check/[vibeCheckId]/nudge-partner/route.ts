import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { notifyPartnerDecisionPending } from "@/lib/services/vibe-check-service";

export const dynamic = "force-dynamic";

async function getSessionUser(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const { session: sessionTable } = await import("@/db/schema");
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session?.user?.id ? { id: session.user.id } : null;
}

/**
 * POST /api/vibe-check/[vibeCheckId]/nudge-partner
 *
 * Called by the deciding user's client when their 60s post-call wait elapses without the
 * partner deciding. Sends one-time push to the partner. Idempotent via partnerNudgeSent.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ vibeCheckId: string }> },
) {
    try {
        const user = await getSessionUser(req);
        if (!user) return errorResponse("Unauthorized", 401);

        const { vibeCheckId } = await params;
        const result = await notifyPartnerDecisionPending(vibeCheckId, user.id);

        if (result.nudged) {
            return successResponse({ nudged: true });
        }

        if (result.reason === "not_found") return errorResponse("Vibe check not found", 404);
        if (result.reason === "not_participant") return errorResponse("Access denied", 403);

        return successResponse({ nudged: false, reason: result.reason });
    } catch (err) {
        console.error("[VibeCheck] NUDGE-PARTNER error:", err);
        return errorResponse("Failed to nudge partner", 500);
    }
}
