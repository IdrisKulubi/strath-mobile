import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { id } = await params;

        const profile = await db.query.profiles.findFirst({
            where: and(eq(profiles.userId, id), eq(profiles.isVisible, true)),
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
            return errorResponse(new Error("User not found or hidden"), 404);
        }

        return successResponse(profile);
    } catch (error) {
        return errorResponse(error);
    }
}
