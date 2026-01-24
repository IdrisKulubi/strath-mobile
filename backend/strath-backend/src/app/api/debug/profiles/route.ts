import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { profiles, session as sessionTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// Helper to get session with Bearer token fallback
async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

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

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        // Get current user's profile
        const currentUserProfile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, session.user.id),
        });

        // Get all profiles with key fields for debugging
        const allProfiles = await db.query.profiles.findMany({
            columns: {
                userId: true,
                gender: true,
                interestedIn: true,
                isVisible: true,
                profileCompleted: true,
            },
        });

        return successResponse({
            currentUser: {
                id: session.user.id,
                email: session.user.email,
            },
            currentUserProfile: currentUserProfile ? {
                userId: currentUserProfile.userId,
                gender: currentUserProfile.gender,
                interestedIn: currentUserProfile.interestedIn,
                isVisible: currentUserProfile.isVisible,
                profileCompleted: currentUserProfile.profileCompleted,
            } : null,
            allProfilesCount: allProfiles.length,
            allProfiles: allProfiles,
        });
    } catch (error) {
        console.error("Debug profiles error:", error);
        return errorResponse("Failed to get debug info", 500);
    }
}
