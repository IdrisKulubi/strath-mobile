/**
 * Hype Me — Moderate Route
 *
 * PATCH /api/hype/moderate — Approve or hide a vouch (profile owner only)
 * DELETE /api/hype/moderate — Permanently delete a vouch (profile owner only)
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hypeVouches, session as sessionTable } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

// ─── Session helper ───────────────────────────────────────────────────────────

async function getSession(req: NextRequest): Promise<AuthSession> {
    let session: AuthSession = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as unknown as AuthSession;
            }
        }
    }
    return session;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const moderateSchema = z.object({
    vouchId: z.string().uuid("Invalid vouch ID"),
    action: z.enum(["approve", "hide"]),
});

const deleteSchema = z.object({
    vouchId: z.string().uuid("Invalid vouch ID"),
});

// ─── PATCH /api/hype/moderate — toggle visibility ────────────────────────────

export async function PATCH(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        const body = await req.json();
        const parsed = moderateSchema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error, 400);

        const { vouchId, action } = parsed.data;

        // Fetch the vouch — must belong to the current user's profile
        const vouch = await db.query.hypeVouches.findFirst({
            where: and(
                eq(hypeVouches.id, vouchId),
                eq(hypeVouches.profileUserId, userId),
            ),
        });

        if (!vouch) return errorResponse("Vouch not found", 404);

        const [updated] = await db
            .update(hypeVouches)
            .set({ isApproved: action === "approve" })
            .where(eq(hypeVouches.id, vouchId))
            .returning();

        return successResponse({
            id: updated.id,
            isApproved: updated.isApproved,
            message: action === "approve" ? "Vouch is now visible on your profile." : "Vouch is now hidden.",
        });
    } catch (error) {
        console.error("[PATCH /api/hype/moderate]", error);
        return errorResponse("Failed to moderate vouch", 500);
    }
}

// ─── DELETE /api/hype/moderate — permanently remove ──────────────────────────

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        const body = await req.json();
        const parsed = deleteSchema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error, 400);

        const { vouchId } = parsed.data;

        const vouch = await db.query.hypeVouches.findFirst({
            where: and(
                eq(hypeVouches.id, vouchId),
                eq(hypeVouches.profileUserId, userId),
            ),
        });

        if (!vouch) return errorResponse("Vouch not found", 404);

        await db.delete(hypeVouches).where(eq(hypeVouches.id, vouchId));

        return successResponse({ message: "Vouch deleted." });
    } catch (error) {
        console.error("[DELETE /api/hype/moderate]", error);
        return errorResponse("Failed to delete vouch", 500);
    }
}
