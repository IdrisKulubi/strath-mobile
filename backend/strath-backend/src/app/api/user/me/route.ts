import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateProfileSchema } from "@/lib/validation";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
    try {
        let session = await auth.api.getSession({ headers: req.headers });

        // Fallback: Manual token check if getSession fails (e.g. Bearer token issue)
        if (!session) {
            const authHeader = req.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];

                // Import session table dynamically to avoid circular deps if any, or just use db
                const { session: sessionTable } = await import("@/db/schema");

                const dbSession = await db.query.session.findFirst({
                    where: eq(sessionTable.token, token),
                    with: {
                        user: true
                    }
                });

                if (dbSession) {
                    const now = new Date();
                    if (dbSession.expiresAt > now) {
                        // Construct a session object compatible with what we need
                        session = {
                            session: dbSession,
                            user: dbSession.user
                        } as any;
                    }
                }
            }
        }

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
        let session = await auth.api.getSession({ headers: req.headers });

        // Fallback: Manual token check if getSession fails
        if (!session) {
            const authHeader = req.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { session: sessionTable } = await import("@/db/schema");
                const dbSession = await db.query.session.findFirst({
                    where: eq(sessionTable.token, token),
                    with: { user: true }
                });

                if (dbSession) {
                    const now = new Date();
                    if (dbSession.expiresAt > now) {
                        session = {
                            session: dbSession,
                            user: dbSession.user
                        } as any;
                    }
                }
            }
        }

        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json();
        const validatedData = updateProfileSchema.parse(body);

        // Filter out null values (keep undefined to not overwrite DB values)
        const filteredData = Object.fromEntries(
            Object.entries(validatedData).filter(([_, value]) => value !== null)
        );

        const updatedProfile = await db
            .update(profiles)
            .set({
                ...filteredData,
                updatedAt: new Date(),
            })
            .where(eq(profiles.userId, session.user.id))
            .returning();

        return successResponse(updatedProfile[0]);
    } catch (error) {
        return errorResponse(error);
    }
}
