import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { session as sessionTable, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const pushTokenSchema = z.object({
    pushToken: z.string().min(1),
});

// Helper to get session with Bearer token fallback
async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

    // Fallback: Manual token check if getSession fails (for Bearer token auth from mobile)
    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
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

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) return errorResponse(new Error("Unauthorized"), 401);

        const body = await req.json();
        const { pushToken } = pushTokenSchema.parse(body);

        await db
            .update(user)
            .set({ pushToken })
            .where(eq(user.id, session.user.id));

        return successResponse({ success: true });
    } catch (error) {
        return errorResponse(error);
    }
}
