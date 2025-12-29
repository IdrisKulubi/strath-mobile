/**
 * Create match and messages between two users
 * Run with: npx tsx src/scripts/create-match.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { matches, messages } from "../db/schema";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env.local");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

// User IDs from the user
const USER1_ID = "LIYcJKdsXxpWpVAhYl6MPGz1bwMZY1mb";
const USER2_ID = "7ctJlzvUBISqtcXqAZHRi4WylQShcoBL";

async function createMatch() {
    console.log("🔗 Creating match between users...\n");

    try {
        // Create match
        const matchId = crypto.randomUUID();
        await db.insert(matches).values({
            id: matchId,
            user1Id: USER1_ID,
            user2Id: USER2_ID,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        console.log(`✓ Match created: ${matchId}`);

        // Create some test messages
        console.log("\n📨 Creating test messages...");
        const testMessages = [
            { senderId: USER1_ID, content: "Hey! 👋 We matched!" },
            { senderId: USER2_ID, content: "Hi there! Nice to meet you 😊" },
            { senderId: USER1_ID, content: "How's it going?" },
        ];

        for (let i = 0; i < testMessages.length; i++) {
            const msgTime = new Date(Date.now() - (testMessages.length - i) * 60000);
            await db.insert(messages).values({
                matchId: matchId,
                senderId: testMessages[i].senderId,
                content: testMessages[i].content,
                status: "delivered",
                createdAt: msgTime,
                updatedAt: msgTime,
            });
            console.log(`  ✓ Message ${i + 1}: "${testMessages[i].content}"`);
        }

        // Update match with last message time
        await db.update(matches)
            .set({ lastMessageAt: new Date() })
            .where(eq(matches.id, matchId));

        console.log("\n" + "═".repeat(50));
        console.log("✅ MATCH CREATED SUCCESSFULLY!");
        console.log("═".repeat(50));
        console.log(`\nMatch ID: ${matchId}`);
        console.log("\n🧪 Now test:");
        console.log("  1. Open the app with User 1");
        console.log("  2. Go to Matches tab → You should see the match");
        console.log("  3. Tap to open chat → See the messages");
        console.log("  4. Send a message to test!");

    } catch (error: any) {
        console.error("❌ Failed:", error.message || error);
        process.exit(1);
    }
}

createMatch();
