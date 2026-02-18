import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
    createOrGetVibeCheck,
    getVibeCheckStatus,
} from "@/lib/services/vibe-check-service";

export const dynamic = "force-dynamic";

// ---- Shared auth helper ----

type SessionUser = { id: string };

async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
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
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }

    return session?.user?.id ? { id: session.user.id } : null;
}

// ============================================
// GET /api/vibe-check?matchId=<id>
// Returns the current vibe check status for a match.
// ============================================
export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser(req);
        if (!user) return errorResponse("Unauthorized", 401);

        const matchId = req.nextUrl.searchParams.get("matchId");
        if (!matchId) return errorResponse("matchId query param is required", 400);

        const status = await getVibeCheckStatus(matchId, user.id);
        if (!status) {
            return successResponse({ exists: false });
        }

        return successResponse({ exists: true, ...status });
    } catch (err) {
        console.error("[VibeCheck] GET error:", err);
        return errorResponse("Failed to get vibe check status", 500);
    }
}

// ============================================
// POST /api/vibe-check
// Body: { matchId: string }
// Creates (or retrieves existing) vibe check session.
// Returns roomUrl + token for the requester.
// ============================================
export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser(req);
        if (!user) return errorResponse("Unauthorized", 401);

        const body = await req.json();
        const { matchId } = body;

        if (!matchId || typeof matchId !== "string") {
            return errorResponse("matchId is required", 400);
        }

        const session = await createOrGetVibeCheck(matchId, user.id);

        return successResponse(session, 201);
    } catch (err) {
        console.error("[VibeCheck] POST (create) error:", err);
        const message = err instanceof Error ? err.message : "Failed to create vibe check";
        return errorResponse(message, 500);
    }
}
