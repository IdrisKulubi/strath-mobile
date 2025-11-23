import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, matches, user } from "@/db/schema";
import { messageSchema } from "@/lib/validation";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq, and, or, asc } from "drizzle-orm";
import { sendPushNotification } from "@/lib/notifications";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { matchId } = await params;

        // Verify user is part of the match
        const match = await db.query.matches.findFirst({
            where: and(
                eq(matches.id, matchId),
                or(eq(matches.user1Id, session.user.id), eq(matches.user2Id, session.user.id))
            ),
        });

        if (!match) {
            return errorResponse(new Error("Match not found or unauthorized"), 404);
        }

        const chatHistory = await db.query.messages.findMany({
            where: eq(messages.matchId, matchId),
            orderBy: [asc(messages.createdAt)],
            limit: 50, // Pagination can be added later
        });

        return successResponse(chatHistory);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { matchId } = await params;
        const body = await req.json();
        const { content } = messageSchema.parse(body);

        // Verify user is part of the match
        const match = await db.query.matches.findFirst({
            where: and(
                eq(matches.id, matchId),
                or(eq(matches.user1Id, session.user.id), eq(matches.user2Id, session.user.id))
            ),
        });

        if (!match) {
            return errorResponse(new Error("Match not found or unauthorized"), 404);
        }

        const partnerId = match.user1Id === session.user.id ? match.user2Id : match.user1Id;

        // Save message
        const [newMessage] = await db
            .insert(messages)
            .values({
                matchId,
                senderId: session.user.id,
                content,
                status: "sent",
            })
            .returning();

        // Update match last message time
        await db
            .update(matches)
            .set({ lastMessageAt: new Date(), updatedAt: new Date() })
            .where(eq(matches.id, matchId));

        // Get partner's push token
        const partner = await db.query.user.findFirst({
            where: eq(user.id, partnerId),
        });

        if (partner?.pushToken) {
            await sendPushNotification(
                partner.pushToken,
                `New message from ${session.user.name}`,
                {
                    type: "message",
                    matchId,
                    messageId: newMessage.id
                }
            );
        }

        return successResponse(newMessage);
    } catch (error) {
        return errorResponse(error);
    }
}
