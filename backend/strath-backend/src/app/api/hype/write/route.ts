/**
 * Hype Me — Write Route (PUBLIC, token-gated)
 *
 * POST /api/hype/write — Submit a vouch via an invite link token
 * No authentication required — external friends can use this
 *
 * GET  /api/hype/write?token= — Validate a token and return profile preview
 */
import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { hypeInviteLinks, hypeVouches, profiles, user } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// ─── Validation ──────────────────────────────────────────────────────────────

const writeVouchSchema = z.object({
    token: z.string().min(1, "Token is required"),
    authorName: z.string().min(1, "Your name is required").max(50, "Name too long"),
    content: z
        .string()
        .min(10, "Vouch must be at least 10 characters")
        .max(200, "Vouch must be 200 characters or less"),
});

// ─── GET /api/hype/write?token= — validate token ─────────────────────────────

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) return errorResponse("Token is required", 400);

        const link = await db.query.hypeInviteLinks.findFirst({
            where: eq(hypeInviteLinks.token, token),
        });

        if (!link) return errorResponse("Invalid invite link", 404);
        if (link.expiresAt < new Date()) return errorResponse("This link has expired", 410);
        if ((link.currentUses ?? 0) >= (link.maxUses ?? 5)) {
            return errorResponse("This link has reached its maximum uses", 410);
        }

        // Fetch profile owner's public info
        const profile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, link.profileUserId),
            columns: {
                userId: true,
                firstName: true,
                lastName: true,
                bio: true,
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
                : (owner?.name ?? "A StrathSpace user");

        return successResponse({
            valid: true,
            profileName,
            profilePhoto: profile?.photos?.[0] || owner?.profilePhoto || null,
            remainingUses: (link.maxUses ?? 5) - (link.currentUses ?? 0),
            expiresAt: link.expiresAt,
        });
    } catch (error) {
        console.error("[GET /api/hype/write]", error);
        return errorResponse("Failed to validate invite link", 500);
    }
}

// ─── POST /api/hype/write — submit vouch ─────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = writeVouchSchema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error, 400);

        const { token, authorName, content } = parsed.data;

        // Validate the invite link
        const link = await db.query.hypeInviteLinks.findFirst({
            where: eq(hypeInviteLinks.token, token),
        });

        if (!link) return errorResponse("Invalid invite link", 404);
        if (link.expiresAt < new Date()) return errorResponse("This link has expired", 410);
        if ((link.currentUses ?? 0) >= (link.maxUses ?? 5)) {
            return errorResponse("This link has reached its maximum uses", 410);
        }

        // Insert the vouch
        const [vouch] = await db
            .insert(hypeVouches)
            .values({
                profileUserId: link.profileUserId,
                authorUserId: null, // External writer, no account
                authorName: authorName.trim(),
                content: content.trim(),
                isApproved: true,
                isFlagged: false,
            })
            .returning();

        // Increment link usage atomically
        await db
            .update(hypeInviteLinks)
            .set({ currentUses: sql`${hypeInviteLinks.currentUses} + 1` })
            .where(eq(hypeInviteLinks.id, link.id));

        return successResponse(
            {
                id: vouch.id,
                message: "Your hype has been submitted! 🔥",
            },
            201
        );
    } catch (error) {
        console.error("[POST /api/hype/write]", error);
        return errorResponse("Failed to submit vouch", 500);
    }
}
