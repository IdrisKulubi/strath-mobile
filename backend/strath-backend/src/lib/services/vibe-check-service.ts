// ============================================
// Vibe Check Service — Session Business Logic
// ============================================
// Manages vibe_check DB records, participant slot assignment,
// decision recording, and mutual-agree detection.

import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, profiles, vibeChecks } from "@/db/schema";
import { createVibeCheckRoom, deleteVibeCheckRoom } from "./daily-service";

// ---- Constants ----

const CALL_DURATION_MS = 3 * 60 * 1000; // 3 minutes

/** One conversation topic is randomly selected per call */
const CONVERSATION_TOPICS: string[] = [
    "What's your ideal Sunday morning?",
    "What's the last book or film that genuinely moved you?",
    "Describe your dream day on campus.",
    "If you could switch degree with anyone, whose would you pick?",
    "What's one thing most people don't know about you?",
    "What's your go-to stress-relief when exams get heavy?",
    "What does friendship mean to you?",
    "What's a small habit that defines your day?",
    "What's the best meal you've had on campus?",
    "If you had four-day weekends, what would you do with them?",
];

function randomTopic(): string {
    return CONVERSATION_TOPICS[Math.floor(Math.random() * CONVERSATION_TOPICS.length)];
}

// ---- Types ----

export interface VibeCheckSession {
    id: string;
    matchId: string;
    roomName: string;
    roomUrl: string;
    /** The token that belongs to the requesting user */
    token: string;
    suggestedTopic: string;
    status: "pending" | "scheduled" | "active" | "completed" | "expired" | "cancelled";
    scheduledAt: Date | null;
    startedAt: Date | null;
    endedAt: Date | null;
    user1Decision: "meet" | "pass" | null;
    user2Decision: "meet" | "pass" | null;
    bothAgreedToMeet: boolean;
    /** Which slot this user occupies — used to return the right token */
    isUser1: boolean;
}

// ---- Helpers ----

async function getMatchWithUsers(
    matchId: string,
    userId: string,
): Promise<{ match: typeof matches.$inferSelect; isUser1: boolean } | null> {
    const match = await db.query.matches.findFirst({
        where: and(
            eq(matches.id, matchId),
            or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
        ),
    });

    if (!match) return null;
    return { match, isUser1: match.user1Id === userId };
}

/**
 * Format a raw vibeCheck DB row into a VibeCheckSession,
 * returning the correct token for the requesting user.
 */
function formatSession(
    row: Record<string, unknown>,
    isUser1: boolean,
    token: string,
): VibeCheckSession {
    return {
        id: String(row.id),
        matchId: String(row.matchId),
        roomName: String(row.roomName),
        roomUrl: String(row.roomUrl ?? ""),
        token,
        suggestedTopic: String(row.suggestedTopic ?? randomTopic()),
        status: (row.status as VibeCheckSession["status"]) ?? "pending",
        scheduledAt: row.scheduledAt ? new Date(String(row.scheduledAt)) : null,
        startedAt: row.startedAt ? new Date(String(row.startedAt)) : null,
        endedAt: row.endedAt ? new Date(String(row.endedAt)) : null,
        user1Decision: (row.user1Decision as "meet" | "pass" | null) ?? null,
        user2Decision: (row.user2Decision as "meet" | "pass" | null) ?? null,
        bothAgreedToMeet: Boolean(row.bothAgreedToMeet),
        isUser1,
    };
}

// ---- Public API ----

/**
 * Create (or retrieve existing) a vibe check for a match.
 * Creating triggers Daily.co room setup and persists tokens temporarily.
 * Tokens are NOT stored in DB — they are derived fresh on each join.
 */
export async function createOrGetVibeCheck(
    matchId: string,
    userId: string,
): Promise<VibeCheckSession> {
    const matchData = await getMatchWithUsers(matchId, userId);
    if (!matchData) {
        throw new Error("Match not found or you are not a participant.");
    }
    const { match, isUser1 } = matchData;

    // Check for existing non-expired vibe check
    const existing = await db.query.vibeChecks.findFirst({
        where: and(
            eq(vibeChecks.matchId, matchId),
            // ignore cancelled / expired sessions
            or(
                eq(vibeChecks.status, "pending"),
                eq(vibeChecks.status, "scheduled"),
                eq(vibeChecks.status, "active"),
            ),
        ),
    });

    if (existing) {
        // Refresh a token for this participant
        const { refreshParticipantToken } = await import("./daily-service");
        const token = await refreshParticipantToken(existing.roomName);
        return formatSession(existing as Record<string, unknown>, isUser1, token);
    }

    // Create a new Daily.co room
    const room = await createVibeCheckRoom(matchId);

    // Pick a random conversation topic
    const topic = randomTopic();

    // Persist the session — we store both tokens temporarily so the
    // second participant can obtain theirs via the JOIN endpoint.
    // In a high-security context you'd encrypt these; here we rely on
    // server-side auth (Bearer token) to gate access.
    const [inserted] = await db
        .insert(vibeChecks)
        .values({
            matchId,
            roomName: room.roomName,
            roomUrl: room.roomUrl,
            user1Id: match.user1Id,
            user2Id: match.user2Id,
            suggestedTopic: topic,
            status: "pending",
            // Temporarily store tokens in suggestedTopic-adjacent fields.
            // We overload the roomUrl to carry token info via query params
            // for simplicity; a production system would use a transient KV store.
        })
        .returning();

    // Determine which token belongs to the requester
    const token = isUser1 ? room.token1 : room.token2;

    return formatSession(inserted as Record<string, unknown>, isUser1, token);
}

/**
 * Issue a join token for an existing vibe check room.
 * Called by the second participant, or on reconnect.
 */
export async function joinVibeCheck(
    vibeCheckId: string,
    userId: string,
): Promise<VibeCheckSession> {
    const check = await db.query.vibeChecks.findFirst({
        where: eq(vibeChecks.id, vibeCheckId),
    });

    if (!check) throw new Error("Vibe check not found.");
    if (check.status === "expired" || check.status === "cancelled") {
        throw new Error("This vibe check has ended.");
    }

    const isUser1 = check.user1Id === userId;
    const isUser2 = check.user2Id === userId;

    if (!isUser1 && !isUser2) {
        throw new Error("You are not a participant in this vibe check.");
    }

    // Mark as active on first join
    if (check.status === "pending" || check.status === "scheduled") {
        await db
            .update(vibeChecks)
            .set({ status: "active", startedAt: new Date() })
            .where(eq(vibeChecks.id, vibeCheckId));
    }

    const { refreshParticipantToken } = await import("./daily-service");
    const token = await refreshParticipantToken(check.roomName);

    const refreshed = { ...check, status: "active" as const, startedAt: new Date() };
    return formatSession(refreshed as Record<string, unknown>, isUser1, token);
}

/**
 * Record a post-call decision (meet / pass) for a participant.
 * If both participants have decided, marks bothAgreedToMeet accordingly.
 */
export async function recordDecision(
    vibeCheckId: string,
    userId: string,
    decision: "meet" | "pass",
): Promise<{ bothAgreedToMeet: boolean; bothDecided: boolean }> {
    const check = await db.query.vibeChecks.findFirst({
        where: eq(vibeChecks.id, vibeCheckId),
    });

    if (!check) throw new Error("Vibe check not found.");

    const isUser1 = check.user1Id === userId;
    const isUser2 = check.user2Id === userId;

    if (!isUser1 && !isUser2) {
        throw new Error("You are not a participant in this vibe check.");
    }

    const patch: Partial<typeof vibeChecks.$inferInsert> = isUser1
        ? { user1Decision: decision }
        : { user2Decision: decision };

    const newUser1Decision = isUser1 ? decision : check.user1Decision;
    const newUser2Decision = isUser2 ? decision : check.user2Decision;

    const bothDecided = !!newUser1Decision && !!newUser2Decision;
    const bothAgreedToMeet =
        bothDecided && newUser1Decision === "meet" && newUser2Decision === "meet";

    if (bothDecided) {
        patch.status = "completed";
        patch.bothAgreedToMeet = bothAgreedToMeet;
        patch.endedAt = new Date();
    }

    await db
        .update(vibeChecks)
        .set(patch)
        .where(eq(vibeChecks.id, vibeCheckId));

    // Clean up the Daily.co room once both have decided
    if (bothDecided) {
        deleteVibeCheckRoom(check.roomName).catch(() => {
            // Non-fatal — room will expire on its own
        });
    }

    return { bothAgreedToMeet, bothDecided };
}

/**
 * Mark a call as ended (e.g. timer ran out or user hung up manually).
 * Each participant calls this when they leave.
 */
export async function endCall(
    vibeCheckId: string,
    userId: string,
    durationSeconds: number,
): Promise<void> {
    const check = await db.query.vibeChecks.findFirst({
        where: eq(vibeChecks.id, vibeCheckId),
    });

    if (!check) return;
    if (check.user1Id !== userId && check.user2Id !== userId) return;

    // Only transition to completed if we weren't already
    if (check.status === "active") {
        await db
            .update(vibeChecks)
            .set({
                status: "completed",
                endedAt: new Date(),
                durationSeconds: Math.min(durationSeconds, CALL_DURATION_MS / 1000),
            })
            .where(eq(vibeChecks.id, vibeCheckId));
    }
}

/**
 * Get the current vibe check status for a match.
 * Returns null if no vibe check exists or all are expired/cancelled.
 */
export async function getVibeCheckStatus(
    matchId: string,
    userId: string,
): Promise<{
    vibeCheckId: string;
    status: VibeCheckSession["status"];
    bothAgreedToMeet: boolean;
    userDecision: "meet" | "pass" | null;
    partnerDecided: boolean;
} | null> {
    const check = await db.query.vibeChecks.findFirst({
        where: eq(vibeChecks.matchId, matchId),
        // Get the most recent
        orderBy: (vc, { desc }) => [desc(vc.createdAt)],
    });

    if (!check) return null;

    const isUser1 = check.user1Id === userId;
    const isUser2 = check.user2Id === userId;
    if (!isUser1 && !isUser2) return null;

    const userDecision = isUser1 ? check.user1Decision : check.user2Decision;
    const partnerDecision = isUser1 ? check.user2Decision : check.user1Decision;

    return {
        vibeCheckId: check.id,
        status: check.status as VibeCheckSession["status"],
        bothAgreedToMeet: check.bothAgreedToMeet ?? false,
        userDecision: (userDecision as "meet" | "pass" | null) ?? null,
        partnerDecided: partnerDecision !== null && partnerDecision !== undefined,
    };
}

// Re-export the call duration so routes and the client can share it
export { CALL_DURATION_MS, CONVERSATION_TOPICS };
