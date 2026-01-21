import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { campusEvents, eventRsvps, user, profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { session as sessionTable } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";

type SessionWithUser = {
    session: typeof sessionTable.$inferSelect;
    user: { id: string; name: string; email: string; image?: string | null };
};

type RsvpStatus = "going" | "interested";

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

// GET /api/events/[eventId]/attendees - Get event attendees
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
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status"); // "going" | "interested" | null (all)
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Check event exists
        const event = await db.query.campusEvents.findFirst({
            where: eq(campusEvents.id, eventId),
        });

        if (!event) {
            return errorResponse("Event not found", 404);
        }

        // Build query conditions
        const conditions = [eq(eventRsvps.eventId, eventId)];
        if (status && ["going", "interested"].includes(status)) {
            conditions.push(eq(eventRsvps.status, status as RsvpStatus));
        }

        // Get RSVPs with user info
        const rsvps = await db
            .select({
                rsvpId: eventRsvps.id,
                status: eventRsvps.status,
                createdAt: eventRsvps.createdAt,
                userId: user.id,
                userName: user.name,
                userImage: user.image,
            })
            .from(eventRsvps)
            .innerJoin(user, eq(eventRsvps.userId, user.id))
            .where(and(...conditions))
            .orderBy(eventRsvps.createdAt)
            .limit(limit)
            .offset(offset);

        // Get profile photos for users
        const userIds = rsvps.map(r => r.userId);
        const profilePhotos = userIds.length > 0 
            ? await db
                .select({
                    userId: profiles.userId,
                    profilePhoto: profiles.profilePhoto,
                    firstName: profiles.firstName,
                })
                .from(profiles)
                .where(eq(profiles.userId, userIds[0])) // Simplified - in production use inArray
            : [];

        // Merge profile data
        const attendees = rsvps.map(rsvp => {
            const profile = profilePhotos.find(p => p.userId === rsvp.userId);
            return {
                id: rsvp.userId,
                name: profile?.firstName || rsvp.userName?.split(' ')[0] || 'User',
                image: profile?.profilePhoto || rsvp.userImage,
                status: rsvp.status,
                rsvpAt: rsvp.createdAt,
            };
        });

        // Separate by status
        const going = attendees.filter(a => a.status === "going");
        const interested = attendees.filter(a => a.status === "interested");

        return successResponse({
            attendees,
            going,
            interested,
            goingCount: going.length,
            interestedCount: interested.length,
            total: attendees.length,
        });
    } catch (error) {
        console.error("Error fetching attendees:", error);
        return errorResponse("Failed to fetch attendees", 500);
    }
}
