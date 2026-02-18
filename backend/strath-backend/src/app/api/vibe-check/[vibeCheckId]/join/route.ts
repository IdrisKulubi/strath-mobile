import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { joinVibeCheck } from "@/lib/services/vibe-check-service";

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
// POST /api/vibe-check/[vibeCheckId]/join
// Issue a fresh participation token for an existing room.
// ============================================
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ vibeCheckId: string }> },
) {
    try {
        const user = await getSessionUser(req);
        if (!user) return errorResponse("Unauthorized", 401);

        const { vibeCheckId } = await params;
        const vcSession = await joinVibeCheck(vibeCheckId, user.id);

        return successResponse(vcSession);
    } catch (err) {
        console.error("[VibeCheck] JOIN error:", err);
        const message = err instanceof Error ? err.message : "Failed to join vibe check";
        return errorResponse(message, 500);
    }
}
