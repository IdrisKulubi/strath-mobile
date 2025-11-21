import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateProfileSchema } from "@/lib/validation";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const profile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, session.user.id),
            with: {
                user: true,
            },
        });

        if (!profile) {
            return errorResponse(new Error("Profile not found"), 404);
        }

        return successResponse(profile);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json();
        const validatedData = updateProfileSchema.parse(body);

        const updatedProfile = await db
            .update(profiles)
            .set({
                ...validatedData,
                updatedAt: new Date(),
                profileCompleted: true, // Assume profile is completed on first update
            })
            .where(eq(profiles.userId, session.user.id))
            .returning();

        return successResponse(updatedProfile[0]);
    } catch (error) {
        return errorResponse(error);
    }
}
