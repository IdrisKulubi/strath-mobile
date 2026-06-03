import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { recordProfileLike } from "@/lib/services/profile-interaction-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    targetUserId: z.string().min(1),
    source: z.string().default("browse"),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = bodySchema.parse(await req.json());
        const event = await recordProfileLike(session.user.id, body.targetUserId, body.source);
        return successResponse(event);
    } catch (error) {
        console.error("[profiles/like] Error:", error);
        return errorResponse(error);
    }
}
