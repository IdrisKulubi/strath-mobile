/**
 * Study Date Mode API
 *
 * GET    /api/study-date          → Active sessions at same university (excludes own)
 * POST   /api/study-date          → Broadcast or update availability
 * DELETE /api/study-date          → End own session
 */
import { NextRequest } from "next/server";
import { and, eq, gt, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { studySessions, profiles, session as sessionTable } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

// ─── Session helper ───────────────────────────────────────────────────────────

async function getSession(req: NextRequest) {
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

// ─── GET /api/study-date ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        // Get user's university (gracefully degrade to empty feed if not set yet)
        const profile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, userId),
            columns: { university: true },
        });

        const university = profile?.university;

        const now = new Date();

        // If university not set, we can't filter – return empty feed + own session
        if (!university) {
            const mySession = await db.query.studySessions.findFirst({
                where: and(
                    eq(studySessions.userId, userId),
                    eq(studySessions.isActive, true),
                    gt(studySessions.availableUntil, now),
                ),
            });
            return successResponse({
                sessions: [],
                mySession: mySession ? formatMySession(mySession) : null,
            });
        }

        const sessions = await db.query.studySessions.findMany({
            where: and(
                eq(studySessions.university, university),
                eq(studySessions.isActive, true),
                gt(studySessions.availableUntil, now),
                ne(studySessions.userId, userId),
            ),
            with: {
                user: {
                    columns: { id: true, name: true, image: true, profilePhoto: true },
                },
            },
            orderBy: (t, { asc }) => [asc(t.availableUntil)],
        });

        // Also fetch the viewer's own active session
        const mySession = await db.query.studySessions.findFirst({
            where: and(
                eq(studySessions.userId, userId),
                eq(studySessions.isActive, true),
                gt(studySessions.availableUntil, now),
            ),
        });

        return successResponse({
            sessions: sessions.map(formatSession),
            mySession: mySession ? formatMySession(mySession) : null,
        });
    } catch (error) {
        console.error("GET /api/study-date error:", error);
        return errorResponse("Failed to fetch study sessions", 500);
    }
}

// ─── POST /api/study-date ─────────────────────────────────────────────────────

const createSessionSchema = z.object({
    locationName: z.string().min(1).max(100),
    availableUntil: z.string().datetime(), // ISO string
    subject: z.string().max(80).optional(),
    vibe: z.enum(["silent_focus", "chill_chat", "group_study"]).default("chill_chat"),
    openToAnyone: z.boolean().optional().default(true),
    preferredGender: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        const profile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, userId),
            columns: { university: true },
        });

        // Default to Strathmore University if profile not fully set up yet
        const university = profile?.university ?? "Strathmore University";

        const body = await req.json();
        const parsed = createSessionSchema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error, 400);

        const { locationName, availableUntil, subject, vibe, openToAnyone, preferredGender } =
            parsed.data;

        const until = new Date(availableUntil);
        if (until <= new Date()) return errorResponse("availableUntil must be in the future", 400);

        // Deactivate any existing session first
        await db
            .update(studySessions)
            .set({ isActive: false })
            .where(and(eq(studySessions.userId, userId), eq(studySessions.isActive, true)));

        const [created] = await db
            .insert(studySessions)
            .values({
                userId,
                university,
                locationName,
                availableUntil: until,
                subject: subject ?? null,
                vibe,
                openToAnyone,
                preferredGender: preferredGender ?? null,
                isActive: true,
            })
            .returning();

        return successResponse({ session: formatMySession(created) }, 201);
    } catch (error) {
        console.error("POST /api/study-date error:", error);
        return errorResponse("Failed to create study session", 500);
    }
}

// ─── DELETE /api/study-date ───────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        await db
            .update(studySessions)
            .set({ isActive: false })
            .where(and(eq(studySessions.userId, userId), eq(studySessions.isActive, true)));

        return successResponse({ ended: true });
    } catch (error) {
        console.error("DELETE /api/study-date error:", error);
        return errorResponse("Failed to end study session", 500);
    }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

type SessionWithUser = typeof studySessions.$inferSelect & {
    user?: {
        id: string;
        name: string;
        image: string | null;
        profilePhoto: string | null;
    };
};

function formatSession(s: SessionWithUser) {
    return {
        id: s.id,
        userId: s.userId,
        locationName: s.locationName,
        university: s.university,
        availableUntil: s.availableUntil.toISOString(),
        isActive: s.isActive,
        subject: s.subject,
        vibe: s.vibe,
        openToAnyone: s.openToAnyone,
        preferredGender: s.preferredGender,
        createdAt: s.createdAt.toISOString(),
        user: s.user
            ? {
                  id: s.user.id,
                  name: s.user.name,
                  image: s.user.profilePhoto ?? s.user.image,
              }
            : null,
    };
}

function formatMySession(s: typeof studySessions.$inferSelect) {
    return {
        id: s.id,
        locationName: s.locationName,
        availableUntil: s.availableUntil.toISOString(),
        subject: s.subject,
        vibe: s.vibe,
        openToAnyone: s.openToAnyone,
        createdAt: s.createdAt.toISOString(),
    };
}
