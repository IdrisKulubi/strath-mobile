import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { campusEvents, eventRsvps } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { session as sessionTable } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";

type SessionWithUser = {
    session: typeof sessionTable.$inferSelect;
    user: { id: string; name: string; email: string; image?: string | null };
};

// Helper to get session with Bearer token fallback
async function getSessionWithFallback(req: NextRequest): Promise<SessionWithUser | null> {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true }
            });

            if (dbSession && dbSession.expiresAt > new Date()) {
                return { session: dbSession, user: dbSession.user } as SessionWithUser;
            }
        }
        return null;
    }
    return session as SessionWithUser;
}

// POST /api/events/[eventId]/rsvp - RSVP to an event
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const { eventId } = await params;
        const body = await request.json();
        const { status } = body; // "going" | "interested" | null (to remove RSVP)

        // Check event exists
        const event = await db.query.campusEvents.findFirst({
            where: eq(campusEvents.id, eventId),
        });

        if (!event) {
            return errorResponse("Event not found", 404);
        }

        // Check if event has passed
        if (new Date(event.startTime) < new Date()) {
            return errorResponse("Cannot RSVP to past events", 400);
        }

        // Check existing RSVP
        const existingRsvp = await db.query.eventRsvps.findFirst({
            where: and(
                eq(eventRsvps.eventId, eventId),
                eq(eventRsvps.userId, session.user.id)
            ),
        });

        // If status is null or undefined, remove RSVP
        if (!status) {
            if (existingRsvp) {
                await db.delete(eventRsvps).where(eq(eventRsvps.id, existingRsvp.id));
            }
            
            // Get updated counts
            const counts = await getRsvpCounts(eventId);
            return successResponse({
                message: "RSVP removed",
                userRsvpStatus: null,
                ...counts,
            });
        }

        // Validate status
        if (!["going", "interested"].includes(status)) {
            return errorResponse("Invalid RSVP status", 400);
        }

        // Check max attendees (only for "going" status)
        if (status === "going" && event.maxAttendees) {
            const goingCount = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(eventRsvps)
                .where(and(
                    eq(eventRsvps.eventId, eventId),
                    eq(eventRsvps.status, "going")
                ));

            const currentGoing = goingCount[0]?.count || 0;
            
            // Don't count if user is updating their existing "going" RSVP
            const isAlreadyGoing = existingRsvp?.status === "going";
            
            if (!isAlreadyGoing && currentGoing >= event.maxAttendees) {
                return errorResponse("Event is at full capacity", 400);
            }
        }

        // Update or insert RSVP
        if (existingRsvp) {
            await db
                .update(eventRsvps)
                .set({ status, createdAt: new Date() })
                .where(eq(eventRsvps.id, existingRsvp.id));
        } else {
            await db.insert(eventRsvps).values({
                eventId,
                userId: session.user.id,
                status,
            });
        }

        // Get updated counts
        const counts = await getRsvpCounts(eventId);

        return successResponse({
            message: `RSVP updated to ${status}`,
            userRsvpStatus: status,
            ...counts,
        });
    } catch (error) {
        console.error("Error updating RSVP:", error);
        return errorResponse("Failed to update RSVP", 500);
    }
}

// Helper to get RSVP counts
async function getRsvpCounts(eventId: string) {
    const rsvpCounts = await db
        .select({
            status: eventRsvps.status,
            count: sql<number>`count(*)::int`,
        })
        .from(eventRsvps)
        .where(eq(eventRsvps.eventId, eventId))
        .groupBy(eventRsvps.status);

    const goingCount = rsvpCounts.find(r => r.status === "going")?.count || 0;
    const interestedCount = rsvpCounts.find(r => r.status === "interested")?.count || 0;

    return {
        goingCount,
        interestedCount,
        totalInterest: goingCount + interestedCount,
    };
}
