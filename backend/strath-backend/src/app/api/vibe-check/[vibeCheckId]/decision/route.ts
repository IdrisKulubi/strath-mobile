import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { recordDecision } from "@/lib/services/vibe-check-service";

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
// POST /api/vibe-check/[vibeCheckId]/decision
// Body: { decision: "meet" | "pass" }
//
// Records the user's post-call decision.
// If both have decided, returns bothAgreedToMeet.
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
        const { decision } = body;

        if (decision !== "meet" && decision !== "pass") {
            return errorResponse('decision must be "meet" or "pass"', 400);
        }

        const result = await recordDecision(vibeCheckId, user.id, decision);

        return successResponse({
            decision,
            bothDecided: result.bothDecided,
            bothAgreedToMeet: result.bothAgreedToMeet,
            message: result.bothAgreedToMeet
                ? "🎉 You both want to meet! Full profiles revealed."
                : result.bothDecided
                ? "Thanks for sharing your vibe!"
                : "Decision recorded — waiting for the other person.",
        });
    } catch (err) {
        console.error("[VibeCheck] DECISION error:", err);
        const message = err instanceof Error ? err.message : "Failed to record decision";
        return errorResponse(message, 500);
    }
}
