import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { campusEvents, eventRsvps, profiles } from "@/db/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
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

// GET /api/events - List events with filters
export async function GET(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const university = searchParams.get("university");
        const timeFilter = searchParams.get("time"); // "today", "week", "all"
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Get user's university from profile
        const userProfile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, session.user.id),
        });

        const targetUniversity = university || userProfile?.university || "Strathmore University";
        
        console.log("[Events API] User:", session.user.id);
        console.log("[Events API] Target university:", targetUniversity);
        console.log("[Events API] User profile university:", userProfile?.university);

        // Build conditions - include events that haven't ended yet
        type EventCategory = "social" | "academic" | "sports" | "career" | "arts" | "gaming" | "faith" | "clubs";
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today
        
        console.log("[Events API] Filtering events from:", now.toISOString());
        
        const conditions = [
            eq(campusEvents.isPublic, true),
            eq(campusEvents.university, targetUniversity),
            gte(campusEvents.startTime, now), // Events starting from today
        ];

        if (category) {
            conditions.push(eq(campusEvents.category, category as EventCategory));
        }

        // Time filter
        if (timeFilter === "today") {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            conditions.push(sql`${campusEvents.startTime} < ${tomorrow}`);
        } else if (timeFilter === "week") {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            conditions.push(sql`${campusEvents.startTime} < ${nextWeek}`);
        }

        // Get events
        const events = await db
            .select({
                id: campusEvents.id,
                title: campusEvents.title,
                description: campusEvents.description,
                category: campusEvents.category,
                coverImage: campusEvents.coverImage,
                university: campusEvents.university,
                location: campusEvents.location,
                isVirtual: campusEvents.isVirtual,
                virtualLink: campusEvents.virtualLink,
                startTime: campusEvents.startTime,
                endTime: campusEvents.endTime,
                creatorId: campusEvents.creatorId,
                organizerName: campusEvents.organizerName,
                maxAttendees: campusEvents.maxAttendees,
                createdAt: campusEvents.createdAt,
            })
            .from(campusEvents)
            .where(and(...conditions))
            .orderBy(campusEvents.startTime)
            .limit(limit)
            .offset(offset);

        console.log("[Events API] Found", events.length, "events");
        if (events.length > 0) {
            console.log("[Events API] First event:", events[0].title, "at", events[0].startTime);
        }

        // Get RSVP counts and user's RSVP status for each event
        const eventIds = events.map(e => e.id);
        
        if (eventIds.length === 0) {
            console.log("[Events API] No events found, returning empty array");
            return successResponse({ events: [], total: 0 });
        }

        // Get RSVP counts
        const rsvpCounts = await db
            .select({
                eventId: eventRsvps.eventId,
                status: eventRsvps.status,
                count: sql<number>`count(*)::int`,
            })
            .from(eventRsvps)
            .where(inArray(eventRsvps.eventId, eventIds))
            .groupBy(eventRsvps.eventId, eventRsvps.status);

        // Get user's RSVPs
        const userRsvps = await db
            .select({
                eventId: eventRsvps.eventId,
                status: eventRsvps.status,
            })
            .from(eventRsvps)
            .where(and(
                inArray(eventRsvps.eventId, eventIds),
                eq(eventRsvps.userId, session.user.id)
            ));

        // Map events with counts and user RSVP
        const eventsWithStats = events.map(event => {
            const goingCount = rsvpCounts.find(r => r.eventId === event.id && r.status === "going")?.count || 0;
            const interestedCount = rsvpCounts.find(r => r.eventId === event.id && r.status === "interested")?.count || 0;
            const userRsvp = userRsvps.find(r => r.eventId === event.id);

            return {
                ...event,
                goingCount,
                interestedCount,
                totalInterest: goingCount + interestedCount,
                userRsvpStatus: userRsvp?.status || null,
            };
        });

        return successResponse({
            events: eventsWithStats,
            total: eventsWithStats.length,
        });
    } catch (error) {
        console.error("Error fetching events:", error);
        return errorResponse("Failed to fetch events", 500);
    }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const body = await request.json();
        const {
            title,
            description,
            category,
            coverImage,
            location,
            isVirtual,
            virtualLink,
            startTime,
            endTime,
            organizerName,
            maxAttendees,
        } = body;

        // Validation
        if (!title || !category || !startTime) {
            return errorResponse("Title, category, and start time are required", 400);
        }

        const validCategories = ["social", "academic", "sports", "career", "arts", "gaming", "faith", "clubs"];
        if (!validCategories.includes(category)) {
            return errorResponse("Invalid category", 400);
        }

        // Get user's university
        const userProfile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, session.user.id),
        });

        const university = userProfile?.university || "Strathmore University";

        // Create event
        const [newEvent] = await db
            .insert(campusEvents)
            .values({
                title,
                description,
                category,
                coverImage,
                university,
                location,
                isVirtual: isVirtual || false,
                virtualLink,
                startTime: new Date(startTime),
                endTime: endTime ? new Date(endTime) : null,
                creatorId: session.user.id,
                organizerName: organizerName || userProfile?.firstName || session.user.name,
                maxAttendees,
                isPublic: true,
            })
            .returning();

        // Auto-RSVP creator as "going"
        await db.insert(eventRsvps).values({
            eventId: newEvent.id,
            userId: session.user.id,
            status: "going",
        });

        return successResponse({
            event: {
                ...newEvent,
                goingCount: 1,
                interestedCount: 0,
                totalInterest: 1,
                userRsvpStatus: "going",
            },
        });
    } catch (error) {
        console.error("Error creating event:", error);
        return errorResponse("Failed to create event", 500);
    }
}
