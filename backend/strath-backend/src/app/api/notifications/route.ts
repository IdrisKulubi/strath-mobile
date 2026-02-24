import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { session as sessionTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// Helper to get session with Bearer token fallback
async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

    // Fallback: Manual token check if getSession fails (for Bearer token auth from mobile)
    if (!session) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true }
            });

            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session;
}

// NOTE: We are using Pusher for real-time notifications. 
// Persistent notifications can be stored in a 'notifications' table if needed.
// For now, we'll assume the client listens to Pusher channels.
// This endpoint could return a history of notifications if we added a table.

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) return errorResponse(new Error("Unauthorized"), 401);

        // Placeholder for fetching notification history
        return successResponse([]);
    } catch (error) {
        return errorResponse(error);
    }
}
