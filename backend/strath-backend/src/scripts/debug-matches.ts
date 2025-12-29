/**
 * Simple debug - check matches
 */
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function check() {
    // Check matches table directly
    const matches = await sql`SELECT * FROM matches LIMIT 5`;
    console.log("MATCHES:", JSON.stringify(matches, null, 2));

    // Check if user1 and user2 relations work
    const matchWithUsers = await sql`
        SELECT 
            m.id as match_id,
            m.user1_id,
            m.user2_id,
            u1.name as user1_name,
            u2.name as user2_name
        FROM matches m
        LEFT JOIN "user" u1 ON m.user1_id = u1.id
        LEFT JOIN "user" u2 ON m.user2_id = u2.id
        LIMIT 5
    `;
    console.log("\nMATCH WITH USERS:", JSON.stringify(matchWithUsers, null, 2));
}

check().catch(e => console.error("ERROR:", e.message));
