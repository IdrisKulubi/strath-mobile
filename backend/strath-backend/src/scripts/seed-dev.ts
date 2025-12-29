/**
 * Seed script for development/testing
 * Aggressive cleanup + Proper BetterAuth hashing
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, or } from "drizzle-orm";
import * as schema from "../db/schema";
import { user, profiles, matches, messages, account, session, verification } from "../db/schema";
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

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    // dkLen 64 is BetterAuth's default for scrypt
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt.toString("hex")}:${key.toString("hex")}`;
}

const ALICE_ID = "test-alice-uuid";
const BOB_ID = "test-bob-uuid";

async function hardCleanup() {
    console.log("🧹 Aggressive cleanup starting...");
    try {
        // Raw SQL for cascading delete where possible or just delete from everything
        // Order matters for FK constraints
        await db.delete(messages);
        await db.delete(matches);
        await db.delete(profiles);
        await db.delete(session);
        await db.delete(account);
        await db.delete(verification);
        await db.delete(user);
        console.log("  ✓ All tables cleared!");
    } catch (e: any) {
        console.log(`  ! Cleanup partial: ${e.message}`);
    }
}

async function seed() {
    console.log("🌱 Starting fresh seed...\n");

    try {
        await hardCleanup();

        console.log("Creating Alice and Bob...");
        const usersToCreate = [
            { id: ALICE_ID, email: "alice@test.com", name: "Alice Test" },
            { id: BOB_ID, email: "bob@test.com", name: "Bob Tester" }
        ];

        for (const u of usersToCreate) {
            await db.insert(user).values({
                id: u.id,
                email: u.email,
                name: u.name,
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActive: new Date(),
            });

            const hashedPassword = await hashPassword("password123");
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: u.id,
                accountId: u.id,
                providerId: "credential",
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            console.log(`  ✓ Created ${u.email}`);
        }

        console.log("\nCreating profiles...");
        await db.insert(profiles).values({
            userId: ALICE_ID,
            firstName: "Alice",
            lastName: "Test",
            bio: "Alice bio",
            age: 22,
            gender: "female",
            isVisible: true,
            profileCompleted: true,
            isComplete: true,
            lookingFor: "dating",
            updatedAt: new Date(),
            createdAt: new Date(),
        });

        await db.insert(profiles).values({
            userId: BOB_ID,
            firstName: "Bob",
            lastName: "Tester",
            bio: "Bob bio",
            age: 23,
            gender: "male",
            isVisible: true,
            profileCompleted: true,
            isComplete: true,
            lookingFor: "dating",
            updatedAt: new Date(),
            createdAt: new Date(),
        });

        console.log("\nCreating match and messages...");
        const matchId = crypto.randomUUID();
        await db.insert(matches).values({
            id: matchId,
            user1Id: ALICE_ID,
            user2Id: BOB_ID,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await db.insert(messages).values({
            matchId: matchId,
            senderId: ALICE_ID,
            content: "Hey Bob! Ready to test?",
            status: "delivered",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await db.update(matches).set({ lastMessageAt: new Date() }).where(eq(matches.id, matchId));

        console.log("\n✅ SEED SUCCESSFUL!");
        console.log("Email: alice@test.com / Pass: password123");
        console.log("Email: bob@test.com / Pass: password123");

    } catch (error: any) {
        console.error("❌ Seed failed:", error.message || error);
        process.exit(1);
    }
}

seed();
