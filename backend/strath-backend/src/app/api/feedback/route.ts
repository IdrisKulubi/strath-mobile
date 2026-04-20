import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { appFeedbackSchema } from "@/lib/validation";
import { feedbacks, profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

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

        // Tag the message with the category on the server so the admin UI
        // can filter without another column change. Keeps schema stable.
        const taggedMessage = `[${parsed.category}] ${parsed.message}`;

        let name: string | null = null;
        let phoneNumber: string | null = null;

        if (!parsed.anonymous) {
            const profile = await db.query.profiles.findFirst({
                where: eq(profiles.userId, session.user.id),
                with: { user: true },
            });

            const first = profile?.firstName?.trim();
            const last = profile?.lastName?.trim();
            name =
                [first, last].filter(Boolean).join(" ") ||
                profile?.user?.name ||
                null;
            phoneNumber = profile?.phoneNumber ?? null;
        }

        await db.insert(feedbacks).values({
            id: crypto.randomUUID(),
            name,
            phoneNumber,
            message: taggedMessage,
            status: "new",
        });

        return successResponse({ ok: true });
    } catch (error) {
        console.error("[feedback] Error:", error);
        return errorResponse(error);
    }
}
