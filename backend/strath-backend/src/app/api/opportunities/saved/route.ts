import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { opportunities, savedOpportunities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/opportunities/saved - Get user's saved opportunities
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        // Fetch saved opportunities with full opportunity data
        const result = await db
            .select({
                savedAt: savedOpportunities.savedAt,
                opportunity: opportunities,
            })
            .from(savedOpportunities)
            .innerJoin(
                opportunities,
                eq(savedOpportunities.opportunityId, opportunities.id)
            )
            .where(eq(savedOpportunities.userId, userId))
            .orderBy(desc(savedOpportunities.savedAt));

        const savedOpps = result.map(r => ({
            ...r.opportunity,
            savedAt: r.savedAt,
            isSaved: true,
        }));

        return NextResponse.json({
            opportunities: savedOpps,
            total: savedOpps.length,
        });
    } catch (error) {
        console.error("Error fetching saved opportunities:", error);
        return NextResponse.json(
            { error: "Failed to fetch saved opportunities" },
            { status: 500 }
        );
    }
}
