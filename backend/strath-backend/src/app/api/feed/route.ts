import { NextResponse } from "next/server";
import db from "@/db/drizzle";
import { profiles, user } from "@/db/schema";
import { eq, and, not } from "drizzle-orm";

export async function GET(request: Request) {
    try {
        // In a real app, we'd filter out swiped users and the current user
        // For now, just return all visible completed profiles
        const feedProfiles = await db.query.profiles.findMany({
            where: and(
                eq(profiles.isVisible, true),
                eq(profiles.isComplete, true)
            ),
            with: {
                // @ts-ignore - Relation is defined but type checking might be strict
                user: true
            },
            limit: 20,
        });

        return NextResponse.json(feedProfiles);
    } catch (error) {
        console.error("Error fetching feed:", error);
        return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
    }
}
