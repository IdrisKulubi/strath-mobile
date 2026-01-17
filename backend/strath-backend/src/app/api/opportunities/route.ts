import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { opportunities, savedOpportunities, type OpportunityCategory } from "@/db/schema";
import { desc, eq, and, gte, or, ilike, sql } from "drizzle-orm";

// GET /api/opportunities - List all opportunities with optional filters
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const category = searchParams.get("category") as OpportunityCategory | null;
        const search = searchParams.get("search");
        const featured = searchParams.get("featured") === "true";
        const userId = searchParams.get("userId"); // For checking saved status
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Build conditions
        const conditions = [eq(opportunities.isActive, true)];

        if (category) {
            conditions.push(eq(opportunities.category, category));
        }

        if (featured) {
            conditions.push(eq(opportunities.isFeatured, true));
        }

        if (search) {
            conditions.push(
                or(
                    ilike(opportunities.title, `%${search}%`),
                    ilike(opportunities.organization, `%${search}%`),
                    ilike(opportunities.description, `%${search}%`)
                )!
            );
        }

        // Fetch opportunities
        const result = await db
            .select()
            .from(opportunities)
            .where(and(...conditions))
            .orderBy(
                desc(opportunities.isFeatured),
                desc(opportunities.postedAt)
            )
            .limit(limit)
            .offset(offset);

        // If userId provided, check which ones are saved
        let savedIds: Set<string> = new Set();
        if (userId) {
            const saved = await db
                .select({ opportunityId: savedOpportunities.opportunityId })
                .from(savedOpportunities)
                .where(eq(savedOpportunities.userId, userId));
            savedIds = new Set(saved.map(s => s.opportunityId));
        }

        // Add isSaved flag to each opportunity
        const opportunitiesWithSaved = result.map(opp => ({
            ...opp,
            isSaved: savedIds.has(opp.id),
        }));

        // Get total count for pagination
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(opportunities)
            .where(and(...conditions));
        
        const total = Number(countResult[0]?.count || 0);

        return NextResponse.json({
            opportunities: opportunitiesWithSaved,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + result.length < total,
            },
        });
    } catch (error) {
        console.error("Error fetching opportunities:", error);
        return NextResponse.json(
            { error: "Failed to fetch opportunities" },
            { status: 500 }
        );
    }
}
