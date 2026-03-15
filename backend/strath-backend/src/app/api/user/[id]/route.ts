import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";

async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const { session: sessionTable } = await import("@/db/schema");
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
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
