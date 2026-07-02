import { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { user } from "@/db/schema";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { successResponse, errorResponse } from "@/lib/api-response";
import { upsertProfileActivitySignal } from "@/lib/services/profile-intelligence-service";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json().catch(() => ({}));
        const isOnline = body?.isOnline !== false;
        const now = new Date();

        await db.update(user)
            .set({
                isOnline,
                lastActive: now,
                updatedAt: now,
            })
            .where(eq(user.id, session.user.id));
        upsertProfileActivitySignal(session.user.id, now).catch((error) => {
            console.warn("[user/presence] profile activity signal update failed", error);
        });

        return successResponse({
            isOnline,
            lastActive: now.toISOString(),
        });
    } catch (error) {
        console.error("[user/presence] Error:", error);
        return errorResponse(error);
    }
}
