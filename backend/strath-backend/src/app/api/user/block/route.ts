import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { blocks, matches } from "@/db/schema";
import { and, eq, or, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { successResponse, errorResponse } from "@/lib/api-response";

// POST - Block a user
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const { blockedUserId } = await request.json();

        if (!blockedUserId) {
            return errorResponse("Blocked user ID is required", 400);
        }

        if (blockedUserId === session.user.id) {
            return errorResponse("You cannot block yourself", 400);
        }

        // Check if already blocked
        const existingBlock = await db.query.blocks.findFirst({
            where: and(
                eq(blocks.blockerId, session.user.id),
                eq(blocks.blockedId, blockedUserId)
            ),
        });

        if (existingBlock) {
            return errorResponse("User is already blocked", 400);
        }

        // Create block
        const [newBlock] = await db
            .insert(blocks)
            .values({
                blockerId: session.user.id,
                blockedId: blockedUserId,
            })
            .returning();

        // Also delete any existing match between these users
        await db.delete(matches).where(
            or(
                and(
                    eq(matches.user1Id, session.user.id),
                    eq(matches.user2Id, blockedUserId)
                ),
                and(
                    eq(matches.user1Id, blockedUserId),
                    eq(matches.user2Id, session.user.id)
                )
            )
        );

        return successResponse({ 
            message: "User blocked successfully",
            block: newBlock 
        });
    } catch (error) {
        console.error("Error blocking user:", error);
        return errorResponse("Failed to block user", 500);
    }
}

// DELETE - Unblock a user
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const { searchParams } = new URL(request.url);
        const blockedUserId = searchParams.get("userId");

        if (!blockedUserId) {
            return errorResponse("Blocked user ID is required", 400);
        }

        // Delete block
        await db.delete(blocks).where(
            and(
                eq(blocks.blockerId, session.user.id),
                eq(blocks.blockedId, blockedUserId)
            )
        );

        return successResponse({ message: "User unblocked successfully" });
    } catch (error) {
        console.error("Error unblocking user:", error);
        return errorResponse("Failed to unblock user", 500);
    }
}

// GET - Get list of blocked users
export async function GET(_request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const blockedUsers = await db.query.blocks.findMany({
            where: eq(blocks.blockerId, session.user.id),
            with: {
                blocked: {
                    with: {
                        profile: true,
                    },
                },
            },
            orderBy: [desc(blocks.createdAt)],
        });

        return successResponse(blockedUsers);
    } catch (error) {
        console.error("Error fetching blocked users:", error);
        return errorResponse("Failed to fetch blocked users", 500);
    }
}
