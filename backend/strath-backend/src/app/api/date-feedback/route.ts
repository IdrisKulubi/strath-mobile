import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dateFeedback, dateMatches } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { dateFeedbackSchema } from "@/lib/validation";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { logEvent, EVENT_TYPES } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/date-feedback?dateId=...
 * Check whether the current user has already submitted feedback for a date
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const dateId = req.nextUrl.searchParams.get("dateId");
        if (!dateId) {
            return errorResponse(new Error("dateId is required"), 400);
        }

        const existing = await db.query.dateFeedback.findFirst({
            where: and(
                eq(dateFeedback.dateMatchId, dateId),
                eq(dateFeedback.userId, session.user.id)
            ),
        });

        return successResponse({
            hasSubmitted: !!existing,
        });
    } catch (error) {
        console.error("[date-feedback][GET] Error:", error);
        return errorResponse(error);
    }
}

/**
 * POST /api/date-feedback
 * Submit post-date feedback (rating, meet_again, optional text)
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json();
        const { dateId, rating, meetAgain, textFeedback } = dateFeedbackSchema.parse(body);

        const dateMatch = await db.query.dateMatches.findFirst({
            where: eq(dateMatches.id, dateId),
        });

        if (!dateMatch) {
            return errorResponse(new Error("Date not found"), 404);
        }

        if (dateMatch.status !== "attended") {
            return errorResponse(new Error("Feedback can only be submitted for dates you attended"), 400);
        }

        const isParticipant =
            dateMatch.userAId === session.user.id || dateMatch.userBId === session.user.id;
        if (!isParticipant) {
            return errorResponse(new Error("You can only leave feedback for dates you attended"), 403);
        }

        const existing = await db.query.dateFeedback.findFirst({
            where: and(
                eq(dateFeedback.dateMatchId, dateId),
                eq(dateFeedback.userId, session.user.id)
            ),
        });

        if (existing) {
            return errorResponse(new Error("You have already submitted feedback for this date"), 400);
        }

        await db.insert(dateFeedback).values({
            dateMatchId: dateId,
            userId: session.user.id,
            rating,
            meetAgain,
            textFeedback: textFeedback ?? null,
        });

        logEvent(EVENT_TYPES.FEEDBACK_SUBMITTED, session.user.id, { dateId, rating, meetAgain }).catch(() => {});

        return successResponse({ success: true });
    } catch (error) {
        console.error("[date-feedback] Error:", error);
        return errorResponse(error);
    }
}
