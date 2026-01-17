import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { savedOpportunities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// POST /api/opportunities/[id]/save - Save/bookmark an opportunity
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: opportunityId } = await params;
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        // Check if already saved
        const existing = await db
            .select()
            .from(savedOpportunities)
            .where(
                and(
                    eq(savedOpportunities.userId, userId),
                    eq(savedOpportunities.opportunityId, opportunityId)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { message: "Already saved", isSaved: true },
                { status: 200 }
            );
        }

        // Save the opportunity
        await db.insert(savedOpportunities).values({
            userId,
            opportunityId,
        });

        return NextResponse.json({
            message: "Opportunity saved successfully",
            isSaved: true,
        });
    } catch (error) {
        console.error("Error saving opportunity:", error);
        return NextResponse.json(
            { error: "Failed to save opportunity" },
            { status: 500 }
        );
    }
}

// DELETE /api/opportunities/[id]/save - Unsave/remove bookmark
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: opportunityId } = await params;
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        await db
            .delete(savedOpportunities)
            .where(
                and(
                    eq(savedOpportunities.userId, userId),
                    eq(savedOpportunities.opportunityId, opportunityId)
                )
            );

        return NextResponse.json({
            message: "Opportunity unsaved successfully",
            isSaved: false,
        });
    } catch (error) {
        console.error("Error unsaving opportunity:", error);
        return NextResponse.json(
            { error: "Failed to unsave opportunity" },
            { status: 500 }
        );
    }
}
