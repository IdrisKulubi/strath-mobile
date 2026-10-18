import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { appFeedbackSchema } from "@/lib/validation";
import { feedbacks, profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

const MATCHMAKER_FEEDBACK_SOURCE = "matchmaker_v2";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const source = req.nextUrl.searchParams.get("source");
        if (source !== MATCHMAKER_FEEDBACK_SOURCE) {
            return errorResponse(new Error("Unsupported feedback source"), 400);
        }

        const [existing] = await db
            .select({ id: feedbacks.id })
            .from(feedbacks)
            .where(and(
                eq(feedbacks.userId, session.user.id),
                eq(feedbacks.source, MATCHMAKER_FEEDBACK_SOURCE),
            ))
            .limit(1);

        return successResponse({ hasSubmitted: Boolean(existing) });
    } catch (error) {
        console.error("[feedback/status] Error:", error);
        return errorResponse(error);
    }
}

/**
 * POST /api/feedback
 * Body: { category, message, anonymous? }
 *
 * App-level feedback: feature requests, bug reports, complaints, etc.
 * Distinct from /api/me/date-feedback (which rates a specific date).
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const json = await req.json();
        const parsed = appFeedbackSchema.parse(json);

        const isMatchmakerFeedback = parsed.source === MATCHMAKER_FEEDBACK_SOURCE;
        const taggedMessage = isMatchmakerFeedback
            ? `[matchmaker_v2] ${parsed.message || "No written comment."}`
            : `[${parsed.category}] ${parsed.message}`;

        const profile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, session.user.id),
            with: { user: true },
        });

        const first = profile?.firstName?.trim();
        const last = profile?.lastName?.trim();
        const name =
            [first, last].filter(Boolean).join(" ") ||
            profile?.user?.name ||
            null;

        // Matchmaker feedback is always attributable so the team can follow up.
        // General app feedback keeps its existing anonymous option.
        const hideContact = !isMatchmakerFeedback && parsed.anonymous;
        const phoneNumber = hideContact
            ? null
            : (profile?.phoneNumber ?? profile?.user?.phoneNumber ?? null);
        const email = hideContact
            ? null
            : (profile?.user?.email ?? session.user.email ?? null);

        if (isMatchmakerFeedback) {
            const [existing] = await db
                .select({ id: feedbacks.id })
                .from(feedbacks)
                .where(and(
                    eq(feedbacks.userId, session.user.id),
                    eq(feedbacks.source, MATCHMAKER_FEEDBACK_SOURCE),
                ))
                .limit(1);
            if (existing) {
                return successResponse({ ok: true, alreadySubmitted: true });
            }
        }

        await db.insert(feedbacks).values({
            id: crypto.randomUUID(),
            userId: session.user.id,
            name,
            phoneNumber,
            email,
            rating: parsed.rating ?? null,
            source: parsed.source,
            message: taggedMessage,
            status: "new",
        });

        return successResponse({ ok: true });
    } catch (error) {
        console.error("[feedback] Error:", error);
        return errorResponse(error);
    }
}
