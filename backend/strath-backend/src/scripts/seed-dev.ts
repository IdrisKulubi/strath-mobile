/**
 * Seed script for development/testing
 * Creates 2 test users with email/password auth and a match between them
 * 
 * Run with: npx tsx src/scripts/seed-dev.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, or } from "drizzle-orm";
import * as schema from "../db/schema";
import { user, profiles, matches, messages, account } from "../db/schema";
import crypto from "crypto";
import dotenv from "dotenv";
import { promisify } from "util";

// Load environment variables
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env.local");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

// Promisify scrypt
const scrypt = promisify(crypto.scrypt);

/**
 * Hash password using scrypt (BetterAuth compatible format)
 * Format: salt:key (both hex encoded)
 */
async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString("hex");
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${key.toString("hex")}`;
}

// Static IDs for consistent testing
const USER1_ID = "test-user-1-alice-dev";
const USER2_ID = "test-user-2-bob-dev";

// Test user data
const TEST_USERS = [
    {
        id: USER1_ID,
        email: "alice@test.com",
        name: "Alice Test",
        firstName: "Alice",
        lastName: "Test",
        password: "password123",
        bio: "Hey! I'm Alice, a test user. Love coding and coffee! ☕",
        age: 22,
        gender: "female",
        university: "Strathmore University",
        course: "Computer Science",
        yearOfStudy: 3,
        interests: ["Coding", "Coffee", "Music", "Travel"],
    },
    {
        id: USER2_ID,
        email: "bob@test.com",
        name: "Bob Tester",
        firstName: "Bob",
        lastName: "Tester",
        password: "password123",
        bio: "Hi! I'm Bob, ready to test chat features 🚀",
        age: 23,
        gender: "male",
        university: "Strathmore University",
        course: "Business IT",
        yearOfStudy: 4,
        interests: ["Sports", "Gaming", "Movies", "Travel"],
    },
];

async function cleanupExistingData() {
    console.log("🧹 Cleaning up existing test data...");

    try {
        await db.delete(messages);
        await db.delete(matches);
        await db.delete(profiles).where(
            or(eq(profiles.userId, USER1_ID), eq(profiles.userId, USER2_ID))
        );
        await db.delete(account).where(
            or(eq(account.userId, USER1_ID), eq(account.userId, USER2_ID))
        );
        await db.delete(user).where(
            or(eq(user.id, USER1_ID), eq(user.id, USER2_ID))
        );
        console.log("  ✓ Cleanup complete");
    } catch (e) {
        console.log("  Note: Cleanup skipped (no existing data)");
    }
}

async function seed() {
    console.log("🌱 Starting seed...\n");

    try {
        await cleanupExistingData();

        // Create users
        console.log("\nCreating test users...");
        for (const testUser of TEST_USERS) {
            await db.insert(user).values({
                id: testUser.id,
                email: testUser.email,
                name: testUser.name,
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActive: new Date(),
                isOnline: false,
            });
            console.log(`  ✓ User: ${testUser.email}`);
        }

        // Create accounts with hashed passwords
        console.log("\nCreating auth accounts...");
        for (const testUser of TEST_USERS) {
            const hashedPassword = await hashPassword(testUser.password);

            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: testUser.id,
                accountId: testUser.id,
                providerId: "credential",
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log(`  ✓ Account: ${testUser.email} (password: ${testUser.password})`);
        }

        // Create profiles
        console.log("\nCreating profiles...");
        for (const testUser of TEST_USERS) {
            await db.insert(profiles).values({
                userId: testUser.id,
                firstName: testUser.firstName,
                lastName: testUser.lastName,
                bio: testUser.bio,
                age: testUser.age,
                gender: testUser.gender,
                university: testUser.university,
                course: testUser.course,
                yearOfStudy: testUser.yearOfStudy,
                interests: testUser.interests,
                isVisible: true,
                profileCompleted: true,
                isComplete: true,
                lookingFor: "dating",
                updatedAt: new Date(),
                createdAt: new Date(),
            });
            console.log(`  ✓ Profile: ${testUser.firstName}`);
        }

        // Create match
        console.log("\nCreating match...");
        const matchId = crypto.randomUUID();
        await db.insert(matches).values({
            id: matchId,
            user1Id: USER1_ID,
            user2Id: USER2_ID,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        console.log(`  ✓ Match ID: ${matchId}`);

        // Create messages
        console.log("\nCreating test messages...");
        const msgs = [
            { senderId: USER1_ID, content: "Hey Bob! 👋 Nice to match with you!" },
            { senderId: USER2_ID, content: "Hi Alice! How are you?" },
            { senderId: USER1_ID, content: "I'm great! Testing this chat app 😄" },
        ];

        for (let i = 0; i < msgs.length; i++) {
            const msgTime = new Date(Date.now() - (msgs.length - i) * 60000);
            await db.insert(messages).values({
                matchId: matchId,
                senderId: msgs[i].senderId,
                content: msgs[i].content,
                status: "delivered",
                createdAt: msgTime,
                updatedAt: msgTime,
            });
        }
        console.log(`  ✓ ${msgs.length} messages created`);

        await db.update(matches)
            .set({ lastMessageAt: new Date() })
            .where(eq(matches.id, matchId));

        console.log("\n" + "═".repeat(50));
        console.log("✅ SEED COMPLETED!");
        console.log("═".repeat(50));
        console.log("\n📝 TEST CREDENTIALS:");
        console.log("─".repeat(50));
        console.log(`  Email: alice@test.com`);
        console.log(`  Password: password123`);
        console.log("─".repeat(50));
        console.log(`  Email: bob@test.com`);
        console.log(`  Password: password123`);
        console.log("─".repeat(50));
        console.log("\n🧪 TO TEST:");
        console.log("  1. Login as alice@test.com on Device A");
        console.log("  2. Login as bob@test.com on Device B");
        console.log("  3. Go to Matches tab → Tap the match");
        console.log("  4. Send messages between them!");

    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
}

seed();
