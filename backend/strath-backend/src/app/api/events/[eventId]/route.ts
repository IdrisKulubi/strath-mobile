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

// GET /api/events/[eventId] - Get event details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const { eventId } = await params;

        // Get event with creator info
        const event = await db.query.campusEvents.findFirst({
            where: eq(campusEvents.id, eventId),
            with: {
                creator: true,
            },
        });

        if (!event) {
            return errorResponse("Event not found", 404);
        }

        // Get RSVP counts
        const rsvpCounts = await db
            .select({
                status: eventRsvps.status,
                count: sql<number>`count(*)::int`,
            })
            .from(eventRsvps)
            .where(eq(eventRsvps.eventId, eventId))
            .groupBy(eventRsvps.status);

        // Get user's RSVP
        const userRsvp = await db.query.eventRsvps.findFirst({
            where: and(
                eq(eventRsvps.eventId, eventId),
                eq(eventRsvps.userId, session.user.id)
            ),
        });

        const goingCount = rsvpCounts.find(r => r.status === "going")?.count || 0;
        const interestedCount = rsvpCounts.find(r => r.status === "interested")?.count || 0;

        return successResponse({
            event: {
                ...event,
                goingCount,
                interestedCount,
                totalInterest: goingCount + interestedCount,
                userRsvpStatus: userRsvp?.status || null,
                isCreator: event.creatorId === session.user.id,
            },
        });
    } catch (error) {
        console.error("Error fetching event:", error);
        return errorResponse("Failed to fetch event", 500);
    }
}

// PATCH /api/events/[eventId] - Update event (creator only)
export async function PATCH(
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

        // Check if user is the creator
        const event = await db.query.campusEvents.findFirst({
            where: eq(campusEvents.id, eventId),
        });

        if (!event) {
            return errorResponse("Event not found", 404);
        }

        if (event.creatorId !== session.user.id) {
            return errorResponse("Not authorized to edit this event", 403);
        }

        // Update allowed fields
        const allowedFields = [
            "title", "description", "category", "coverImage", "location",
            "isVirtual", "virtualLink", "startTime", "endTime", "organizerName", "maxAttendees"
        ];

        const updates: Record<string, string | boolean | number | Date | null> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                if (field === "startTime" || field === "endTime") {
                    updates[field] = body[field] ? new Date(body[field]) : null;
                } else {
                    updates[field] = body[field];
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            return errorResponse("No valid fields to update", 400);
        }

        updates.updatedAt = new Date();

        const [updatedEvent] = await db
            .update(campusEvents)
            .set(updates)
            .where(eq(campusEvents.id, eventId))
            .returning();

        return successResponse({ event: updatedEvent });
    } catch (error) {
        console.error("Error updating event:", error);
        return errorResponse("Failed to update event", 500);
    }
}

// DELETE /api/events/[eventId] - Delete event (creator only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const { eventId } = await params;

        // Check if user is the creator
        const event = await db.query.campusEvents.findFirst({
            where: eq(campusEvents.id, eventId),
        });

        if (!event) {
            return errorResponse("Event not found", 404);
        }

        if (event.creatorId !== session.user.id) {
            return errorResponse("Not authorized to delete this event", 403);
        }

        // Delete event (RSVPs will cascade)
        await db.delete(campusEvents).where(eq(campusEvents.id, eventId));

        return successResponse({ message: "Event deleted" });
    } catch (error) {
        console.error("Error deleting event:", error);
        return errorResponse("Failed to delete event", 500);
    }
}
