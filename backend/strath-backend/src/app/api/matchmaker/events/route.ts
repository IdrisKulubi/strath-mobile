import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { errorResponse, successResponse } from "@/lib/api-response";
import db from "@/db/drizzle";
import { matchmakerSessionResults, matchmakerShortlists } from "@/db/schema";
import { getSessionWithBearerFallback } from "@/lib/security";
import { trackMatchmakerEvent } from "@/lib/services/matchmaker-analytics-service";
import { requireMatchmakerBriefAccess } from "@/lib/services/matchmaker-brief-access";
import { matchmakerRouteErrorResponse } from "@/lib/services/matchmaker-route-errors";

const eventSchema = z.object({
    event: z.enum([
        "shortlist_viewed",
        "shortlist_page_changed",
        "explanation_expanded",
        "compare_opened",
        "comparison_row_viewed",
        "shortlist_profile_opened",
        "candidate_unavailable",
        "feedback_reason_selected",
        "feedback_follow_up_requested",
        "feedback_follow_up_completed",
        "feedback_learning_previewed",
        "feedback_learning_cancelled",
    ]),
    shortlistId: z.string().uuid(),
    position: z.number().int().min(0).max(2).optional(),
    shortlistSize: z.number().int().min(1).max(3),
    candidateUserId: z.string().min(1).optional(),
    reasonCode: z.enum(["lifestyle_mismatch", "relationship_goals", "communication_style", "attraction", "practical_mismatch", "something_else"]).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        const userId = session?.user?.id;
        if (!userId) return errorResponse(new Error("Unauthorized"), 401);
        const denied = await requireMatchmakerBriefAccess(userId);
        if (denied) return denied;
        const body = eventSchema.parse(await req.json());
        const shortlist = await db.query.matchmakerShortlists.findFirst({
            where: and(
                eq(matchmakerShortlists.id, body.shortlistId),
                eq(matchmakerShortlists.viewerUserId, userId),
            ),
            columns: { id: true, sessionId: true },
        });
        if (!shortlist) return errorResponse("Shortlist not found", 404);
        if (body.candidateUserId) {
            const result = await db.query.matchmakerSessionResults.findFirst({
                where: and(
                    eq(matchmakerSessionResults.shortlistId, body.shortlistId),
                    eq(matchmakerSessionResults.viewerUserId, userId),
                    eq(matchmakerSessionResults.candidateUserId, body.candidateUserId),
                ),
                columns: { id: true },
            });
            if (!result) return errorResponse("Candidate not found in shortlist", 404);
        }
        await trackMatchmakerEvent({
            event: body.event,
            userId,
            sessionId: shortlist.sessionId,
            candidateUserId: body.candidateUserId,
            metadata: {
                shortlistId: body.shortlistId,
                shortlistSize: body.shortlistSize,
                candidatePosition: body.position !== undefined ? body.position + 1 : null,
                ...(body.reasonCode ? { reasonCode: body.reasonCode } : {}),
            },
        });
        return successResponse({ recorded: true });
    } catch (error) {
        return matchmakerRouteErrorResponse(error);
    }
}
