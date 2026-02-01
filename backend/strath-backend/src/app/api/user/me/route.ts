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
                    } else {
                        console.error('[PATCH /api/user/me] Session expired');
                        return errorResponse(new Error("Session expired. Please log in again."), 401);
                    }
                } else {
                    console.error('[PATCH /api/user/me] Token not found in database');
                }
            } else {
                console.error('[PATCH /api/user/me] No authorization header');
            }
        }

        if (!session) {
            return errorResponse(new Error("Unauthorized. Please log in again."), 401);
        }

        console.log('[PATCH /api/user/me] User ID:', session.user.id);

        const body = await req.json();
        console.log('[PATCH /api/user/me] Request body keys:', Object.keys(body));
        
        const validatedData = updateProfileSchema.parse(body);

        // Filter out null values (keep undefined to not overwrite DB values)
        const filteredData = Object.fromEntries(
            Object.entries(validatedData).filter(([_, value]) => value !== null && value !== undefined)
        );

        // Check if profile exists
        const existingProfile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, session.user.id),
        });

        let resultProfile;

        if (existingProfile) {
            // Update existing profile
            const updated = await db
                .update(profiles)
                .set({
                    ...filteredData,
                    updatedAt: new Date(),
                })
                .where(eq(profiles.userId, session.user.id))
                .returning();
            resultProfile = updated[0];
        } else {
            // Create new profile
            const inserted = await db
                .insert(profiles)
                .values({
                    userId: session.user.id,
                    firstName: (filteredData as any).firstName || session.user.name?.split(' ')[0] || '',
                    lastName: (filteredData as any).lastName || session.user.name?.split(' ').slice(1).join(' ') || '',
                    ...filteredData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();
            resultProfile = inserted[0];
        }

        return successResponse(resultProfile);
    } catch (error: any) {
        console.error('[PATCH /api/user/me] Error:', error);
        
        // Check for Zod validation errors
        if (error.name === 'ZodError') {
            const message = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Validation error';
            return errorResponse(new Error(message), 400);
        }
        
        return errorResponse(error);
    }
}
