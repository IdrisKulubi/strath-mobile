import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { AI_CONSENT_REQUIRED_MESSAGE, hasAiConsent } from "@/lib/ai-consent";
import { getSessionWithBearerFallback } from "@/lib/security";
import { addMatchmakerConversationMessage } from "@/lib/services/matchmaker-session-service";
import { requireMatchmakingAccess } from "@/lib/services/profile-access";

export const dynamic = "force-dynamic";

const messageSchema = z.object({
    text: z.string().trim().min(1).max(800),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        try {
            await requireMatchmakingAccess(session.user.id);
        } catch (accessError) {
            return errorResponse(accessError, accessError instanceof Error && accessError.message === "Profile not found" ? 404 : 403);
        }

        if (!(await hasAiConsent(session.user.id))) {
            return errorResponse(AI_CONSENT_REQUIRED_MESSAGE, 403);
        }

        const body = messageSchema.parse(await req.json());
        const conversation = await addMatchmakerConversationMessage({
            userId: session.user.id,
            text: body.text,
        });
        return successResponse(conversation);
    } catch (error) {
        console.error("[matchmaker/session/messages] Error:", error);
        return errorResponse(error);
    }
}
