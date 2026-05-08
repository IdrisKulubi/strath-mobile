import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { canViewUserProfile } from "@/lib/services/profile-view-access";
import { getSessionWithBearerFallback } from "@/lib/security";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { id } = await params;

        const profile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, id),
            with: {
                user: {
                    columns: {
                        name: true,
                        image: true,
                        isOnline: true,
                        lastActive: true,
                    },
                },
            },
        });

        if (!profile) {
            return errorResponse(new Error("User not found"), 404);
        }

        const canViewProfile = await canViewUserProfile({
            viewerUserId: session.user.id,
            targetUserId: id,
            targetIsVisible: profile.isVisible,
        });

        if (!canViewProfile) {
            return errorResponse(new Error("User not found or hidden"), 404);
        }

        const normalizedProfilePhoto =
            (Array.isArray(profile.photos) ? profile.photos[0] : null)
            ?? profile.profilePhoto
            ?? profile.user?.image
            ?? null;

        return successResponse({
            ...profile,
            profilePhoto: normalizedProfilePhoto,
        });
    } catch (error) {
        return errorResponse(error);
    }
}
