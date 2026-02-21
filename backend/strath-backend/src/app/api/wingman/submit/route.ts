/**
 * Wingman — Public token-gated submission endpoint
 *
 * GET  /api/wingman/submit?token=  → validate token + profile preview
 * POST /api/wingman/submit         → submit friend response (no auth)
 */
import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
    profiles,
    user,
    wingmanLinks,
    wingmanSubmissions,
    agentAnalytics,
} from "@/db/schema";
import { sendPushNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function normalizeWingmanToken(raw: string) {
    const trimmed = raw.trim();
    // Tokens are generated as 24 random bytes hex => 48 hex chars.
    // Extract the first 48-hex substring to tolerate punctuation from copy/paste.
    const match = trimmed.match(/([a-f0-9]{48})/i);
    return (match?.[1] ?? trimmed).toLowerCase();
}

const submitSchema = z.object({
    token: z.string().min(1),
    authorName: z.string().min(1).max(50),
    relationship: z.string().max(30).optional().nullable(),

    threeWords: z.array(z.string().min(1).max(20)).min(1).max(5),
    greenFlags: z.array(z.string().min(1).max(60)).min(0).max(5).default([]),

    redFlagFunny: z.string().max(120).optional().nullable(),
    hypeNote: z.string().max(200).optional().nullable(),
});

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tokenParam = searchParams.get("token");
        const token = tokenParam ? normalizeWingmanToken(tokenParam) : null;
        if (!token) return errorResponse("Token is required", 400);

        const link = await db.query.wingmanLinks.findFirst({
            where: eq(wingmanLinks.token, token),
        });

        if (!link) return errorResponse("Invalid wingman link", 404);
        if (link.expiresAt < new Date()) return errorResponse("This link has expired", 410);
        if ((link.currentSubmissions ?? 0) >= (link.targetSubmissions ?? 3)) {
            return errorResponse("This link already has enough submissions", 410);
        }

        const profile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, link.profileUserId),
            columns: {
                firstName: true,
                lastName: true,
                photos: true,
            },
        });

        const owner = await db.query.user.findFirst({
            where: eq(user.id, link.profileUserId),
            columns: { name: true, profilePhoto: true },
        });

        const profileName =
            profile?.firstName
                ? `${profile.firstName} ${profile.lastName ?? ""}`.trim()
                : owner?.name ?? "A StrathSpace user";

        const remaining = (link.targetSubmissions ?? 3) - (link.currentSubmissions ?? 0);

        return successResponse({
            valid: true,
            profileName,
            profilePhoto: profile?.photos?.[0] || owner?.profilePhoto || null,
            roundNumber: link.roundNumber,
            remainingSubmissions: remaining,
            expiresAt: link.expiresAt,
        });
    } catch (error) {
        console.error("[GET /api/wingman/submit]", error);
        return errorResponse("Failed to validate wingman link", 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = submitSchema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error, 400);

        const {
            token: rawToken,
            authorName,
            relationship,
            threeWords,
            greenFlags,
            redFlagFunny,
            hypeNote,
        } = parsed.data;

        const token = normalizeWingmanToken(rawToken);

        const link = await db.query.wingmanLinks.findFirst({
            where: eq(wingmanLinks.token, token),
        });

        if (!link) return errorResponse("Invalid wingman link", 404);
        if (link.expiresAt < new Date()) return errorResponse("This link has expired", 410);
        if (link.status !== "collecting") return errorResponse("This link is no longer collecting", 410);
        if ((link.currentSubmissions ?? 0) >= (link.targetSubmissions ?? 3)) {
            return errorResponse("This link already has enough submissions", 410);
        }

        await db.insert(wingmanSubmissions).values({
            linkId: link.id,
            authorName: authorName.trim(),
            relationship: relationship?.trim() || null,
            threeWords: threeWords.map((w) => w.trim()).filter(Boolean),
            greenFlags: greenFlags.map((g) => g.trim()).filter(Boolean),
            redFlagFunny: redFlagFunny?.trim() || null,
            hypeNote: hypeNote?.trim() || null,
            isFlagged: false,
        });

        // Increment progress atomically
        await db
            .update(wingmanLinks)
            .set({
                currentSubmissions: sql`${wingmanLinks.currentSubmissions} + 1`,
                lastSubmissionAt: new Date(),
            })
            .where(eq(wingmanLinks.id, link.id));

        const updated = await db.query.wingmanLinks.findFirst({
            where: eq(wingmanLinks.id, link.id),
            columns: {
                currentSubmissions: true,
                targetSubmissions: true,
                profileUserId: true,
                roundNumber: true,
            },
        });

        const current = updated?.currentSubmissions ?? (link.currentSubmissions ?? 0) + 1;
        const target = updated?.targetSubmissions ?? link.targetSubmissions ?? 3;

        if (current >= target) {
            await db
                .update(wingmanLinks)
                .set({ status: "ready" })
                .where(eq(wingmanLinks.id, link.id));
        }

        // Analytics (non-blocking)
        db.insert(agentAnalytics)
            .values({
                userId: link.profileUserId,
                eventType: "wingman_submission_received",
                metadata: { roundNumber: link.roundNumber, current, target },
            })
            .catch(() => {});

        // Push notification to the profile owner (non-blocking)
        const owner = await db.query.user.findFirst({
            where: eq(user.id, link.profileUserId),
            columns: { pushToken: true },
        });

        if (owner?.pushToken) {
            const msg =
                current >= target
                    ? "✨ Your Wingman Pack is ready"
                    : `Wingman update: ${current}/${target} friends replied`;

            sendPushNotification(owner.pushToken, msg, {
                screen: "wingman",
                roundNumber: link.roundNumber,
            }).catch(() => {});
        }

        return successResponse({ ok: true, current, target }, 201);
    } catch (error) {
        console.error("[POST /api/wingman/submit]", error);
        return errorResponse("Failed to submit wingman response", 500);
    }
}
