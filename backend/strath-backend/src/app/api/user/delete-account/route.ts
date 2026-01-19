import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { user, session as sessionTable, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

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

// DELETE /api/user/delete-account - Soft delete user account
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const userId = session.user.id;

        // Mark the user as deleted (soft delete)
        await db.update(user)
            .set({ 
                deletedAt: new Date(),
                isOnline: false,
            })
            .where(eq(user.id, userId));

        // Mark profile as invisible so they don't show in discovery
        await db.update(profiles)
            .set({
                isVisible: false,
                discoveryPaused: true,
            })
            .where(eq(profiles.userId, userId));

        // Delete all sessions to log them out everywhere
        await db.delete(sessionTable)
            .where(eq(sessionTable.userId, userId));

        return successResponse({ 
            message: "Account has been deleted successfully",
            deletedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error deleting account:", error);
        return errorResponse("Failed to delete account", 500);
    }
}
