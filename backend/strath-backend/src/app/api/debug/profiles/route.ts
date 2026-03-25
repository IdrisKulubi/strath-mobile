import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { profiles } from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { isDebugRouteEnabled, requireAdminApiSession } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        if (!isDebugRouteEnabled()) {
            return errorResponse("Not found", 404);
        }

        const session = await requireAdminApiSession(req);
        if (!session?.user?.id) {
            return errorResponse("Forbidden - admin only", 403);
        }

        const currentUserProfile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, session.user.id),
        });

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
            currentUserProfile: currentUserProfile
                ? {
                      userId: currentUserProfile.userId,
                      gender: currentUserProfile.gender,
                      interestedIn: currentUserProfile.interestedIn,
                      isVisible: currentUserProfile.isVisible,
                      profileCompleted: currentUserProfile.profileCompleted,
                  }
                : null,
            allProfilesCount: allProfiles.length,
            allProfiles,
        });
    } catch (error) {
        console.error("Debug profiles error:", error);
        return errorResponse("Failed to get debug info", 500);
    }
}
