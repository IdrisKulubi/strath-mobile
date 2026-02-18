// ============================================
// Daily.co Room Service — Vibe Check Voice Calls
// ============================================
// Manages WebRTC room lifecycle via Daily.co REST API.
// Full docs: https://docs.daily.co/reference/rest-api
//
// Design:
//  • Rooms are ephemeral (auto-deleted after expiry)
//  • Audio-only: screenshare + camera disabled by default
//  • Max 2 participants per room
//  • Each room lives for ROOM_TTL_SECONDS from creation

const DAILY_API_BASE = "https://api.daily.co/v1";
const DAILY_API_KEY = process.env.DAILY_API_KEY ?? "";

/** How long (seconds) a room stays available after creation */
const ROOM_TTL_SECONDS = 5 * 60; // 5 min (3 min call + 2 min buffer)

/** Max call duration enforced server-side by Daily.co */
const MAX_CALL_DURATION_SECONDS = 3 * 60; // 3 minutes

export interface DailyRoom {
    roomName: string;
    roomUrl: string;
    /** Pre-signed meeting token for participant 1 */
    token1: string;
    /** Pre-signed meeting token for participant 2 */
    token2: string;
    expiresAt: Date;
}

// ---- Internal helpers ----

function dailyHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
    };
}

async function dailyFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    if (!DAILY_API_KEY) {
        throw new Error("DAILY_API_KEY is not configured on the server.");
    }

    const res = await fetch(`${DAILY_API_BASE}${path}`, {
        ...options,
        headers: { ...dailyHeaders(), ...(options.headers ?? {}) },
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Daily.co API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
}

/** Create a short-lived meeting token for a specific room */
async function createMeetingToken(
    roomName: string,
    expiresAt: number,
): Promise<string> {
    const data = await dailyFetch<{ token: string }>("/meeting-tokens", {
        method: "POST",
        body: JSON.stringify({
            properties: {
                room_name: roomName,
                exp: expiresAt,
                // Disable camera from the meeting-token level
                start_video_off: true,
                start_audio_off: false,
            },
        }),
    });

    return data.token;
}

// ---- Public API ----

/**
 * Create an audio-only Daily.co room for a vibe check call.
 * Returns room details + two pre-signed tokens (one per participant).
 */
export async function createVibeCheckRoom(matchId: string): Promise<DailyRoom> {
    const roomName = `vibe-${matchId.slice(0, 8)}-${Date.now()}`;
    const expiresAt = Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS;

    await dailyFetch(`/rooms`, {
        method: "POST",
        body: JSON.stringify({
            name: roomName,
            properties: {
                max_participants: 2,
                exp: expiresAt,
                // Audio-only settings
                enable_screenshare: false,
                enable_chat: false,
                // Enforce 3-min call limit
                eject_at_token_exp: true,
                nbf: Math.floor(Date.now() / 1000) - 30, // valid from 30s ago (clock skew)
                // UI customisations — not all apply to prebuilt but set for API completeness
                start_video_off: true,
                start_audio_off: false,
                // Max call duration enforced at room level
                meeting_expiry_threshold: MAX_CALL_DURATION_SECONDS,
            },
        }),
    });

    const roomUrl = `https://${process.env.DAILY_DOMAIN ?? "strathspace.daily.co"}/${roomName}`;

    const [token1, token2] = await Promise.all([
        createMeetingToken(roomName, expiresAt),
        createMeetingToken(roomName, expiresAt),
    ]);

    return {
        roomName,
        roomUrl,
        token1,
        token2,
        expiresAt: new Date(expiresAt * 1000),
    };
}

/**
 * Delete a Daily.co room by name.
 * Safe to call even if the room has already expired/been deleted.
 */
export async function deleteVibeCheckRoom(roomName: string): Promise<void> {
    try {
        await dailyFetch(`/rooms/${roomName}`, { method: "DELETE" });
    } catch (err) {
        // Silently ignore 404 — room may have already expired
        if (err instanceof Error && err.message.includes("404")) return;
        throw err;
    }
}

/**
 * Generate a fresh meeting token for a user joining an existing room.
 * Used when a user reconnects after a drop.
 */
export async function refreshParticipantToken(
    roomName: string,
    ttlSeconds = ROOM_TTL_SECONDS,
): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    return createMeetingToken(roomName, expiresAt);
}
