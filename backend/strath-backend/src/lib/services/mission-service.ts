import { db } from "@/lib/db";
import { matches, matchMissions, profiles } from "@/db/schema";
import { and, desc, eq, not, or } from "drizzle-orm";

export type MissionType =
    | "coffee_meetup"
    | "song_exchange"
    | "photo_challenge"
    | "study_date"
    | "campus_walk"
    | "food_adventure"
    | "sunset_spot"
    | "quiz_challenge";

export type MissionStatus = "proposed" | "accepted" | "completed" | "expired" | "skipped";

export type MissionRating = "amazing" | "nice" | "meh" | "not_for_me";

type MissionTemplate = {
    missionType: MissionType;
    title: string;
    description: string;
    emoji: string;
    deadlineDays: number;
};

const CAMPUS_LOCATIONS = {
    coffee: ["Strath Café", "Cafeteria"],
    study: ["Main Library", "Student Center"],
    walk: ["Chapel Gardens", "Student Center lawn"],
    food: ["Cafeteria", "Strath Café"],
    sunset: ["Chapel Gardens", "Student Center lawn"],
} as const;

const TEMPLATES: Record<MissionType, MissionTemplate> = {
    coffee_meetup: {
        missionType: "coffee_meetup",
        title: "Coffee Meetup",
        description: "Grab coffee together and keep it low-pressure — 30 mins is enough.",
        emoji: "☕",
        deadlineDays: 3,
    },
    song_exchange: {
        missionType: "song_exchange",
        title: "Song Exchange",
        description: "Share one song each, then meet and explain why you picked it.",
        emoji: "🎵",
        deadlineDays: 2,
    },
    photo_challenge: {
        missionType: "photo_challenge",
        title: "Photo Challenge",
        description: "Both take a photo of your favorite campus spot and swap stories.",
        emoji: "📸",
        deadlineDays: 3,
    },
    study_date: {
        missionType: "study_date",
        title: "Study Date",
        description: "Study together for 1 hour — focused first, then a quick debrief.",
        emoji: "📚",
        deadlineDays: 4,
    },
    campus_walk: {
        missionType: "campus_walk",
        title: "Campus Walk",
        description: "Take a short walk together — no phones for the first 10 minutes.",
        emoji: "🚶‍♂️",
        deadlineDays: 3,
    },
    food_adventure: {
        missionType: "food_adventure",
        title: "Food Adventure",
        description: "Try something new together and rate it honestly.",
        emoji: "🍕",
        deadlineDays: 5,
    },
    sunset_spot: {
        missionType: "sunset_spot",
        title: "Sunset Spot",
        description: "Pick a chill spot and catch a sunset — quick and wholesome.",
        emoji: "🌅",
        deadlineDays: 3,
    },
    quiz_challenge: {
        missionType: "quiz_challenge",
        title: "Mini Quiz",
        description: "Ask each other 5 fun questions — then compare answers in person.",
        emoji: "❓",
        deadlineDays: 2,
    },
};

function normalizeInterests(interests: unknown): string[] {
    if (!Array.isArray(interests)) return [];
    return interests
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean);
}

function intersection(a: string[], b: string[]): string[] {
    const setB = new Set(b.map((s) => s.toLowerCase()));
    return a.filter((s) => setB.has(s.toLowerCase()));
}

function containsAny(haystack: string[], needles: string[]): boolean {
    const set = new Set(haystack.map((s) => s.toLowerCase()));
    return needles.some((n) => set.has(n.toLowerCase()));
}

function pickRandom<T>(items: readonly T[]): T | null {
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)] ?? null;
}

function suggestedLocationFor(type: MissionType): string | null {
    switch (type) {
        case "coffee_meetup":
            return pickRandom(CAMPUS_LOCATIONS.coffee);
        case "study_date":
            return pickRandom(CAMPUS_LOCATIONS.study);
        case "campus_walk":
            return pickRandom(CAMPUS_LOCATIONS.walk);
        case "food_adventure":
            return pickRandom(CAMPUS_LOCATIONS.food);
        case "sunset_spot":
            return pickRandom(CAMPUS_LOCATIONS.sunset);
        case "song_exchange":
        case "photo_challenge":
        case "quiz_challenge":
            return null;
        default:
            return null;
    }
}

function suggestedTimeFor(deadlineDays: number): string {
    if (deadlineDays <= 2) return "In the next 48 hours";
    if (deadlineDays <= 3) return "Before Friday";
    return "Before this weekend";
}

export function chooseMissionTypeFromProfiles(params: {
    user1Interests: string[];
    user2Interests: string[];
}): { missionType: MissionType; sharedInterests: string[] } {
    const sharedInterests = intersection(params.user1Interests, params.user2Interests);

    if (containsAny(sharedInterests, ["music", "afrobeats", "hip hop", "rap", "rnb", "r&b"])) {
        return { missionType: "song_exchange", sharedInterests };
    }
    if (containsAny(sharedInterests, ["photography", "photos", "camera", "editing"])) {
        return { missionType: "photo_challenge", sharedInterests };
    }
    if (containsAny(sharedInterests, ["studying", "study", "library", "books"])) {
        return { missionType: "study_date", sharedInterests };
    }
    if (containsAny(sharedInterests, ["food", "cooking", "restaurants"])) {
        return { missionType: "food_adventure", sharedInterests };
    }
    if (containsAny(sharedInterests, ["walking", "hiking", "outdoors", "nature"])) {
        return { missionType: "campus_walk", sharedInterests };
    }

    return { missionType: "coffee_meetup", sharedInterests };
}

export async function getLatestMissionForMatch(matchId: string) {
    return db.query.matchMissions.findFirst({
        where: eq(matchMissions.matchId, matchId),
        orderBy: [desc(matchMissions.createdAt)],
    });
}

export async function ensureMissionForMatch(matchId: string) {
    const existing = await getLatestMissionForMatch(matchId);
    if (existing && existing.status !== "skipped") {
        return existing;
    }

    const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
    });

    if (!match) {
        throw new Error("Match not found");
    }

    const [p1, p2] = await Promise.all([
        db.query.profiles.findFirst({ where: eq(profiles.userId, match.user1Id) }),
        db.query.profiles.findFirst({ where: eq(profiles.userId, match.user2Id) }),
    ]);

    const user1Interests = normalizeInterests(p1?.interests);
    const user2Interests = normalizeInterests(p2?.interests);

    const { missionType } = chooseMissionTypeFromProfiles({ user1Interests, user2Interests });
    const template = TEMPLATES[missionType];

    const deadline = new Date(Date.now() + template.deadlineDays * 24 * 60 * 60 * 1000);
    const suggestedLocation = suggestedLocationFor(template.missionType);
    const suggestedTime = suggestedTimeFor(template.deadlineDays);

    const [created] = await db
        .insert(matchMissions)
        .values({
            matchId,
            missionType: template.missionType,
            title: template.title,
            description: template.description,
            emoji: template.emoji,
            suggestedLocation,
            suggestedTime,
            deadline,
            status: "proposed",
        })
        .returning();

    return created;
}

export async function refreshMissionExpiry(missionId: string) {
    const mission = await db.query.matchMissions.findFirst({
        where: eq(matchMissions.id, missionId),
    });
    if (!mission) return null;

    const now = new Date();
    if (mission.status !== "completed" && mission.status !== "expired" && mission.deadline < now) {
        const [updated] = await db
            .update(matchMissions)
            .set({ status: "expired", updatedAt: new Date() })
            .where(eq(matchMissions.id, mission.id))
            .returning();
        return updated;
    }

    return mission;
}

export async function suggestOtherMission(params: { matchId: string; excludeTypes?: MissionType[] }) {
    const match = await db.query.matches.findFirst({ where: eq(matches.id, params.matchId) });
    if (!match) throw new Error("Match not found");

    const latest = await getLatestMissionForMatch(params.matchId);
    if (latest && latest.status !== "skipped") {
        await db
            .update(matchMissions)
            .set({ status: "skipped", updatedAt: new Date() })
            .where(eq(matchMissions.id, latest.id));
    }

    const [p1, p2] = await Promise.all([
        db.query.profiles.findFirst({ where: eq(profiles.userId, match.user1Id) }),
        db.query.profiles.findFirst({ where: eq(profiles.userId, match.user2Id) }),
    ]);

    const user1Interests = normalizeInterests(p1?.interests);
    const user2Interests = normalizeInterests(p2?.interests);
    const sharedInterests = intersection(user1Interests, user2Interests);

    const excluded = new Set((params.excludeTypes ?? []).map(String));
    if (latest?.missionType) excluded.add(latest.missionType);

    const ranked: MissionType[] = [
        "coffee_meetup",
        "song_exchange",
        "photo_challenge",
        "study_date",
        "campus_walk",
        "food_adventure",
        "sunset_spot",
        "quiz_challenge",
    ];

    const preferred = chooseMissionTypeFromProfiles({ user1Interests, user2Interests }).missionType;
    const candidates = [preferred, ...ranked.filter((t) => t !== preferred)].filter((t) => !excluded.has(t));
    const missionType = candidates[0] ?? "coffee_meetup";
    const template = TEMPLATES[missionType];

    const deadline = new Date(Date.now() + template.deadlineDays * 24 * 60 * 60 * 1000);
    const suggestedLocation = suggestedLocationFor(template.missionType);
    const suggestedTime = suggestedTimeFor(template.deadlineDays);

    const enrichedDescription =
        sharedInterests.length > 0
            ? `${template.description} You both vibe with ${sharedInterests.slice(0, 2).join(" & ")}.`
            : template.description;

    const [created] = await db
        .insert(matchMissions)
        .values({
            matchId: params.matchId,
            missionType: template.missionType,
            title: template.title,
            description: enrichedDescription,
            emoji: template.emoji,
            suggestedLocation,
            suggestedTime,
            deadline,
            status: "proposed",
        })
        .returning();

    return created;
}

export async function setMissionState(params: {
    matchId: string;
    userId: string;
    action: "accept" | "complete";
}) {
    const match = await db.query.matches.findFirst({
        where: and(
            eq(matches.id, params.matchId),
            or(eq(matches.user1Id, params.userId), eq(matches.user2Id, params.userId))
        ),
    });
    if (!match) throw new Error("Match not found or unauthorized");

    const mission = await ensureMissionForMatch(params.matchId);
    const isUser1 = match.user1Id === params.userId;

    const patch: Partial<typeof matchMissions.$inferInsert> = {
        updatedAt: new Date(),
    };

    if (params.action === "accept") {
        if (isUser1) patch.user1Accepted = true;
        else patch.user2Accepted = true;
    } else {
        if (isUser1) patch.user1Completed = true;
        else patch.user2Completed = true;
    }

    const [updated] = await db
        .update(matchMissions)
        .set(patch)
        .where(eq(matchMissions.id, mission.id))
        .returning();

    const nextStatus: MissionStatus =
        (updated.user1Completed && updated.user2Completed)
            ? "completed"
            : (updated.user1Accepted && updated.user2Accepted)
                ? "accepted"
                : (updated.status ?? "proposed");

    if (nextStatus !== updated.status) {
        const [final] = await db
            .update(matchMissions)
            .set({ status: nextStatus, updatedAt: new Date() })
            .where(eq(matchMissions.id, updated.id))
            .returning();
        return final;
    }

    return updated;
}

export async function setMissionRating(params: {
    matchId: string;
    userId: string;
    rating: MissionRating;
}) {
    const match = await db.query.matches.findFirst({
        where: and(
            eq(matches.id, params.matchId),
            or(eq(matches.user1Id, params.userId), eq(matches.user2Id, params.userId))
        ),
    });
    if (!match) throw new Error("Match not found or unauthorized");

    const mission = await ensureMissionForMatch(params.matchId);
    const isUser1 = match.user1Id === params.userId;

    const patch: Partial<typeof matchMissions.$inferInsert> = {
        updatedAt: new Date(),
        ...(isUser1 ? { user1Rating: params.rating } : { user2Rating: params.rating }),
    };

    const [updated] = await db
        .update(matchMissions)
        .set(patch)
        .where(eq(matchMissions.id, mission.id))
        .returning();

    return updated;
}
