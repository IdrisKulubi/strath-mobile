import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { endCall } from "@/lib/services/vibe-check-service";
import { vibeChecks } from "@/db/schema";

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

// ============================================
// GET /api/vibe-check/[vibeCheckId]/result
// Returns current status + mutual decision result.
// Poll this every 5s after submitting your own decision.
// ============================================
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ vibeCheckId: string }> },
) {
    try {
        const user = await getSessionUser(req);
        if (!user) return errorResponse("Unauthorized", 401);

        const { vibeCheckId } = await params;

        const check = await db.query.vibeChecks.findFirst({
            where: eq(vibeChecks.id, vibeCheckId),
        });

        if (!check) return errorResponse("Vibe check not found", 404);

        const isUser1 = check.user1Id === user.id;
        const isUser2 = check.user2Id === user.id;
        if (!isUser1 && !isUser2) return errorResponse("Access denied", 403);

        const userDecision = isUser1 ? check.user1Decision : check.user2Decision;
        const partnerDecision = isUser1 ? check.user2Decision : check.user1Decision;

        return successResponse({
            vibeCheckId: check.id,
            status: check.status,
            bothAgreedToMeet: check.bothAgreedToMeet ?? false,
            userDecision: userDecision ?? null,
            partnerDecision: partnerDecision ?? null,
            bothDecided: !!userDecision && !!partnerDecision,
            durationSeconds: check.durationSeconds,
        });
    } catch (err) {
        console.error("[VibeCheck] RESULT error:", err);
        return errorResponse("Failed to get result", 500);
    }
}

// ============================================
// POST /api/vibe-check/[vibeCheckId]/result
// Body: { durationSeconds: number }
// Signals that the user has left the call.
// ============================================
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ vibeCheckId: string }> },
) {
    try {
        const user = await getSessionUser(req);
        if (!user) return errorResponse("Unauthorized", 401);

        const { vibeCheckId } = await params;
        const body = await req.json();
        const durationSeconds = typeof body.durationSeconds === "number"
            ? body.durationSeconds
            : 0;

        await endCall(vibeCheckId, user.id, durationSeconds);

        return successResponse({ message: "Call ended." });
    } catch (err) {
        console.error("[VibeCheck] END error:", err);
        return errorResponse("Failed to end call", 500);
    }
}
