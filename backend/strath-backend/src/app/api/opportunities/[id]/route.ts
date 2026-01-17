import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { opportunities, savedOpportunities } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// GET /api/opportunities/[id] - Get a single opportunity by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get("userId");

        // Fetch the opportunity
        const result = await db
            .select()
            .from(opportunities)
            .where(eq(opportunities.id, id))
            .limit(1);

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Opportunity not found" },
                { status: 404 }
            );
        }

        const opportunity = result[0];

        // Check if saved by user
        let isSaved = false;
        if (userId) {
            const saved = await db
                .select()
                .from(savedOpportunities)
                .where(
                    sql`${savedOpportunities.userId} = ${userId} AND ${savedOpportunities.opportunityId} = ${id}`
                )
                .limit(1);
            isSaved = saved.length > 0;
        }

        // Increment view count
        await db
            .update(opportunities)
            .set({ viewCount: sql`${opportunities.viewCount} + 1` })
            .where(eq(opportunities.id, id));

        return NextResponse.json({
            ...opportunity,
            isSaved,
        });
    } catch (error) {
        console.error("Error fetching opportunity:", error);
        return NextResponse.json(
            { error: "Failed to fetch opportunity" },
            { status: 500 }
        );
    }
}
