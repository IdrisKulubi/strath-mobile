import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray, or } from "drizzle-orm";
import * as schema from "../db/schema";
import {
    account,
    candidatePairs,
    dateFeedback,
    dateMatches,
    matches,
    messages,
    mutualMatches,
    profiles,
    session,
    user,
    verification,
} from "../db/schema";
import crypto from "crypto";
import dotenv from "dotenv";
import { promisify } from "util";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env.local");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });
const scrypt = promisify(crypto.scrypt);

const DEMO_MAIN_ID = "demo-dates-main";
const DEMO_IDS = [
    DEMO_MAIN_ID,
    "demo-dates-mutual",
    "demo-dates-call",
    "demo-dates-arranging",
    "demo-dates-upcoming",
    "demo-dates-history-attended",
    "demo-dates-history-cancelled",
    "demo-dates-history-no-show",
] as const;

const DEMO_EMAIL = "datesdemo@test.com";
const DEMO_PASSWORD = "password123";
export const DEMO_SESSION_TOKEN = "strathspace-demo-dates-session-v1";

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt.toString("hex")}:${key.toString("hex")}`;
}

function avatar(seed: string) {
    return `https://api.dicebear.com/9.x/adventurer/png?seed=${encodeURIComponent(seed)}`;
}

function daysFromNow(days: number) {
    const value = new Date();
    value.setDate(value.getDate() + days);
    return value;
}

async function cleanupDemoData() {
    console.log("[seed-dates-demo] Cleaning existing demo records...");

    const existingMatches = await db
        .select({ id: matches.id })
        .from(matches)
        .where(
            or(
                inArray(matches.user1Id, [...DEMO_IDS]),
                inArray(matches.user2Id, [...DEMO_IDS]),
            ),
        );

    const existingDateMatches = await db
        .select({ id: dateMatches.id })
        .from(dateMatches)
        .where(
            or(
                inArray(dateMatches.userAId, [...DEMO_IDS]),
                inArray(dateMatches.userBId, [...DEMO_IDS]),
            ),
        );

    if (existingDateMatches.length > 0) {
        await db.delete(dateFeedback).where(inArray(dateFeedback.dateMatchId, existingDateMatches.map((row) => row.id)));
    }

    if (existingMatches.length > 0) {
        await db.delete(messages).where(inArray(messages.matchId, existingMatches.map((row) => row.id)));
    }

    await db.delete(mutualMatches).where(
        or(
            inArray(mutualMatches.userAId, [...DEMO_IDS]),
            inArray(mutualMatches.userBId, [...DEMO_IDS]),
        ),
    );

    await db.delete(dateMatches).where(
        or(
            inArray(dateMatches.userAId, [...DEMO_IDS]),
            inArray(dateMatches.userBId, [...DEMO_IDS]),
        ),
    );

    await db.delete(candidatePairs).where(
        or(
            inArray(candidatePairs.userAId, [...DEMO_IDS]),
            inArray(candidatePairs.userBId, [...DEMO_IDS]),
        ),
    );

    await db.delete(messages).where(eq(messages.senderId, DEMO_MAIN_ID));
    await db.delete(matches).where(
        or(
            inArray(matches.user1Id, [...DEMO_IDS]),
            inArray(matches.user2Id, [...DEMO_IDS]),
        ),
    );

    await db.delete(session).where(inArray(session.userId, [...DEMO_IDS]));
    await db.delete(account).where(inArray(account.userId, [...DEMO_IDS]));
    await db.delete(verification).where(eq(verification.identifier, DEMO_EMAIL));
    await db.delete(profiles).where(inArray(profiles.userId, [...DEMO_IDS]));
    await db.delete(user).where(inArray(user.id, [...DEMO_IDS]));
}

async function createUserWithProfile(input: {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
    bio: string;
    lookingFor?: string;
    interests?: string[];
    profilePhotoSeed: string;
}) {
    const now = new Date();
    const profilePhoto = avatar(input.profilePhotoSeed);
    const interests = JSON.stringify(input.interests ?? ["coffee", "music", "walks"]);

    await db.insert(user).values({
        id: input.id,
        email: input.email,
        name: input.name,
        emailVerified: true,
        profilePhoto,
        createdAt: now,
        updatedAt: now,
        lastActive: now,
    });

    await sql`
        insert into profiles (
            user_id,
            bio,
            age,
            gender,
            interests,
            is_visible,
            updated_at,
            is_complete,
            profile_completed,
            looking_for,
            course,
            year_of_study,
            university,
            profile_photo,
            first_name,
            last_name,
            created_at,
            communication_style,
            love_language,
            about_me,
            personality_summary,
            ai_consent_granted
        ) values (
            ${input.id},
            ${input.bio},
            ${input.age},
            ${input.gender},
            ${interests}::json,
            ${true},
            ${now},
            ${true},
            ${true},
            ${input.lookingFor ?? "dating"},
            ${"Business IT"},
            ${3},
            ${"Strathmore"},
            ${profilePhoto},
            ${input.firstName},
            ${input.lastName},
            ${now},
            ${"both"},
            ${"quality time"},
            ${input.bio},
            ${"Warm, playful and easy to talk to."},
            ${false}
        )
    `;
}

async function createLoginAccount(userId: string, password: string) {
    const hashedPassword = await hashPassword(password);
    await db.insert(account).values({
        id: crypto.randomUUID(),
        userId,
        accountId: userId,
        providerId: "credential",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

async function createDemoSession(userId: string) {
    const now = new Date();
    await db.insert(session).values({
        id: crypto.randomUUID(),
        userId,
        token: DEMO_SESSION_TOKEN,
        expiresAt: daysFromNow(30),
        ipAddress: "demo-login",
        userAgent: "strathspace-demo-button",
        createdAt: now,
        updatedAt: now,
    });
}

async function main() {
    console.log("[seed-dates-demo] Seeding demo dates data...");
    await cleanupDemoData();

    await createUserWithProfile({
        id: DEMO_MAIN_ID,
        email: DEMO_EMAIL,
        name: "Demo Dates User",
        firstName: "Demo",
        lastName: "User",
        age: 22,
        gender: "female",
        bio: "Using this account to preview the dates experience.",
        interests: ["coffee", "music", "campus walks"],
        profilePhotoSeed: "Demo User",
    });
    await createLoginAccount(DEMO_MAIN_ID, DEMO_PASSWORD);
    await createDemoSession(DEMO_MAIN_ID);

    const partners = [
        {
            id: "demo-dates-mutual",
            email: "demo.mutual@test.com",
            name: "Kai Mutual",
            firstName: "Kai",
            lastName: "Mutual",
            age: 23,
            bio: "Fresh mutual match.",
            seed: "Kai Mutual",
        },
        {
            id: "demo-dates-call",
            email: "demo.call@test.com",
            name: "Noah Call",
            firstName: "Noah",
            lastName: "Call",
            age: 24,
            bio: "Ready for the 3-minute call.",
            seed: "Noah Call",
        },
        {
            id: "demo-dates-arranging",
            email: "demo.arranging@test.com",
            name: "Ava Arranging",
            firstName: "Ava",
            lastName: "Arranging",
            age: 22,
            bio: "Already passed the call stage.",
            seed: "Ava Arranging",
        },
        {
            id: "demo-dates-upcoming",
            email: "demo.upcoming@test.com",
            name: "Mia Upcoming",
            firstName: "Mia",
            lastName: "Upcoming",
            age: 21,
            bio: "Date is already confirmed.",
            seed: "Mia Upcoming",
        },
        {
            id: "demo-dates-history-attended",
            email: "demo.history1@test.com",
            name: "Liam Completed",
            firstName: "Liam",
            lastName: "Completed",
            age: 23,
            bio: "Completed date example.",
            seed: "Liam Completed",
        },
        {
            id: "demo-dates-history-cancelled",
            email: "demo.history2@test.com",
            name: "Zoe Cancelled",
            firstName: "Zoe",
            lastName: "Cancelled",
            age: 22,
            bio: "Cancelled date example.",
            seed: "Zoe Cancelled",
        },
        {
            id: "demo-dates-history-no-show",
            email: "demo.history3@test.com",
            name: "Eli NoShow",
            firstName: "Eli",
            lastName: "NoShow",
            age: 24,
            bio: "No-show history example.",
            seed: "Eli NoShow",
        },
    ];

    for (const partner of partners) {
        await createUserWithProfile({
            id: partner.id,
            email: partner.email,
            name: partner.name,
            firstName: partner.firstName,
            lastName: partner.lastName,
            age: partner.age,
            gender: "male",
            bio: partner.bio,
            profilePhotoSeed: partner.seed,
            interests: ["coffee", "music", "study dates"],
        });
    }

    const pairIds = {
        mutual: crypto.randomUUID(),
        call: crypto.randomUUID(),
        arranging: crypto.randomUUID(),
        upcoming: crypto.randomUUID(),
    };

    await db.insert(candidatePairs).values([
        {
            id: pairIds.mutual,
            userAId: DEMO_MAIN_ID,
            userBId: "demo-dates-mutual",
            compatibilityScore: 92,
            matchReasons: ["Aligned relationship goals", "Shared interest in coffee", "Same university"],
            shownToAAt: new Date(),
            shownToBAt: new Date(),
            aDecision: "open_to_meet",
            bDecision: "open_to_meet",
            status: "mutual",
            expiresAt: daysFromNow(2),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: pairIds.call,
            userAId: DEMO_MAIN_ID,
            userBId: "demo-dates-call",
            compatibilityScore: 88,
            matchReasons: ["Matching communication style", "Shared interest in music", "Recently active"],
            shownToAAt: new Date(),
            shownToBAt: new Date(),
            aDecision: "open_to_meet",
            bDecision: "open_to_meet",
            status: "mutual",
            expiresAt: daysFromNow(2),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: pairIds.arranging,
            userAId: DEMO_MAIN_ID,
            userBId: "demo-dates-arranging",
            compatibilityScore: 85,
            matchReasons: ["Same university", "Similar social energy", "Complete profile"],
            shownToAAt: new Date(),
            shownToBAt: new Date(),
            aDecision: "open_to_meet",
            bDecision: "open_to_meet",
            status: "mutual",
            expiresAt: daysFromNow(2),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: pairIds.upcoming,
            userAId: DEMO_MAIN_ID,
            userBId: "demo-dates-upcoming",
            compatibilityScore: 90,
            matchReasons: ["Aligned relationship goals", "Shared interest in coffee", "Recently active"],
            shownToAAt: new Date(),
            shownToBAt: new Date(),
            aDecision: "open_to_meet",
            bDecision: "open_to_meet",
            status: "mutual",
            expiresAt: daysFromNow(2),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ]);

    const callLegacyMatchId = crypto.randomUUID();
    await db.insert(matches).values({
        id: callLegacyMatchId,
        user1Id: DEMO_MAIN_ID,
        user2Id: "demo-dates-call",
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const upcomingDateMatchId = crypto.randomUUID();
    await db.insert(dateMatches).values({
        id: upcomingDateMatchId,
        candidatePairId: pairIds.upcoming,
        userAId: DEMO_MAIN_ID,
        userBId: "demo-dates-upcoming",
        vibe: "coffee",
        callCompleted: true,
        userAConfirmed: true,
        userBConfirmed: true,
        status: "scheduled",
        venueName: "Artcaffe",
        venueAddress: "Westlands",
        scheduledAt: daysFromNow(2),
        createdAt: new Date(),
    });

    await db.insert(mutualMatches).values([
        {
            candidatePairId: pairIds.mutual,
            userAId: DEMO_MAIN_ID,
            userBId: "demo-dates-mutual",
            status: "mutual",
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            candidatePairId: pairIds.call,
            userAId: DEMO_MAIN_ID,
            userBId: "demo-dates-call",
            status: "call_pending",
            legacyMatchId: callLegacyMatchId,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            candidatePairId: pairIds.arranging,
            userAId: DEMO_MAIN_ID,
            userBId: "demo-dates-arranging",
            status: "being_arranged",
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            candidatePairId: pairIds.upcoming,
            userAId: DEMO_MAIN_ID,
            userBId: "demo-dates-upcoming",
            status: "upcoming",
            legacyDateMatchId: upcomingDateMatchId,
            venueName: "Artcaffe",
            venueAddress: "Westlands",
            scheduledAt: daysFromNow(2),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ]);

    const historyRows = [
        {
            id: crypto.randomUUID(),
            userBId: "demo-dates-history-attended",
            vibe: "dinner" as const,
            status: "attended" as const,
            venueName: "Hero Restaurant",
            venueAddress: "Village Market",
            scheduledAt: daysFromNow(-7),
            createdAt: daysFromNow(-10),
        },
        {
            id: crypto.randomUUID(),
            userBId: "demo-dates-history-cancelled",
            vibe: "walk" as const,
            status: "cancelled" as const,
            venueName: "Karura Forest",
            venueAddress: "Karura",
            scheduledAt: daysFromNow(-3),
            createdAt: daysFromNow(-5),
        },
        {
            id: crypto.randomUUID(),
            userBId: "demo-dates-history-no-show",
            vibe: "coffee" as const,
            status: "no_show" as const,
            venueName: "Java House",
            venueAddress: "CBD",
            scheduledAt: daysFromNow(-1),
            createdAt: daysFromNow(-2),
        },
    ];

    await db.insert(dateMatches).values(
        historyRows.map((row) => ({
            id: row.id,
            userAId: DEMO_MAIN_ID,
            userBId: row.userBId,
            vibe: row.vibe,
            callCompleted: true,
            userAConfirmed: true,
            userBConfirmed: row.status === "attended",
            status: row.status,
            venueName: row.venueName,
            venueAddress: row.venueAddress,
            scheduledAt: row.scheduledAt,
            createdAt: row.createdAt,
        })),
    );

    console.log("");
    console.log("[seed-dates-demo] Done.");
    console.log(`Login email: ${DEMO_EMAIL}`);
    console.log(`Login password: ${DEMO_PASSWORD}`);
    console.log(`Demo session token: ${DEMO_SESSION_TOKEN}`);
    console.log("Dates sections seeded: mutual, call_pending, being_arranged, upcoming, history.");
}

main().catch((error) => {
    console.error("[seed-dates-demo] Failed:", error);
    process.exit(1);
});
