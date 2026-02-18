import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
    getAgentContext,
    resetAgentContext,
    getWingmanStats,
} from "@/services/agent-context";

export const dynamic = "force-dynamic";

// ============================================
// AGENT CONTEXT API
// ============================================
// GET  /api/agent/context  — Return wingman memory summary + proactive message
// DELETE /api/agent/context — Wipe all wingman memory for a fresh start

async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
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
    return session;
}

/**
 * GET /api/agent/context
 * Returns full wingman memory summary including:
 * - Stats (total queries, feedback, learned traits)
 * - Recent query history
 * - Proactive/contextual greeting message
 * - Feedback breakdown
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const ctx = await getAgentContext(session.user.id);
        const stats = getWingmanStats(ctx);

        return successResponse({
            ...stats,
            hasMemory: ctx.queryHistory.length > 0 || ctx.matchFeedback.length > 0,
        });
    } catch (error) {
        console.error("[AgentContext API] GET error:", error);
        return errorResponse("Failed to get wingman context", 500);
    }
}

/**
 * DELETE /api/agent/context
 * Wipes all wingman memory — learned preferences, query history, match feedback.
 * User gets a fresh start.
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        await resetAgentContext(session.user.id);

        return successResponse({
            message: "Wingman memory cleared — fresh start! 🧹",
        });
    } catch (error) {
        console.error("[AgentContext API] DELETE error:", error);
        return errorResponse("Failed to reset wingman memory", 500);
    }
}
