import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { messages, matches, user } from "@/db/schema";
import { messageSchema } from "@/lib/validation";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq, and, or, asc, desc, lt, gt } from "drizzle-orm";
import { sendPushNotification } from "@/lib/notifications";
import { assertChatReadable, assertChatUnlocked } from "@/lib/chat-access";
import { questionnaireChatAccess, saveMessageIdempotently } from "@/lib/questionnaire/phase5-service";
import { getSessionWithBearerFallback } from "@/lib/security";

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;

function parseMessageLimit(raw: string | null): number {
    if (!raw) return DEFAULT_MESSAGE_LIMIT;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_MESSAGE_LIMIT;
    return Math.min(n, MAX_MESSAGE_LIMIT);
}

function parseIsoDate(raw: string | null): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const session = await getSessionWithBearerFallback(req);

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

        const gate = await assertChatReadable(matchId, session.user.id);
        if (gate) return gate;

        const { searchParams } = new URL(req.url);
        const since = parseIsoDate(searchParams.get("since"));
        const before = parseIsoDate(searchParams.get("before"));
        const limit = parseMessageLimit(searchParams.get("limit"));

        if (since) {
            const delta = await db.query.messages.findMany({
                where: and(
                    eq(messages.matchId, matchId),
                    gt(messages.createdAt, since),
                ),
                orderBy: [asc(messages.createdAt)],
            });
            return successResponse({
                messages: delta,
                hasMore: false,
            });
        }

        const whereClause = before
            ? and(eq(messages.matchId, matchId), lt(messages.createdAt, before))
            : eq(messages.matchId, matchId);

        const latestBatch = await db.query.messages.findMany({
            where: whereClause,
            orderBy: [desc(messages.createdAt)],
            limit: limit + 1,
        });

        const hasMore = latestBatch.length > limit;
        const page = hasMore ? latestBatch.slice(0, limit) : latestBatch;
        const chatHistory = [...page].reverse();

        return successResponse({
            messages: chatHistory,
            hasMore,
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const session = await getSessionWithBearerFallback(req);

        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { matchId } = await params;
        const body = await req.json();
        const { content, clientRequestId } = messageSchema.parse(body);

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

        const gate = await assertChatUnlocked(matchId, session.user.id);
        if (gate) return gate;

        const partnerId = match.user1Id === session.user.id ? match.user2Id : match.user1Id;

        // Save message
        const saved = await saveMessageIdempotently(matchId, session.user.id, content, clientRequestId);
        const newMessage = saved.message;

        // A network retry with the same client request ID returns the original row
        // without sending a second push or moving the conversation timestamp.
        if (!saved.created) return successResponse(newMessage);

        // Get partner's push token
        const partner = await db.query.user.findFirst({
            where: eq(user.id, partnerId),
        });

        if (partner?.pushToken) {
            const isQuestionnaireConnection = await questionnaireChatAccess(matchId, session.user.id);
            await sendPushNotification(
                partner.pushToken,
                `New message from ${session.user.name}`,
                {
                    type: "message",
                    matchId,
                    messageId: newMessage.id,
                    route: isQuestionnaireConnection ? `/dating-chat/${matchId}` : `/chat/${matchId}`,
                }
            );
        }

        return successResponse(newMessage);
    } catch (error) {
        return errorResponse(error);
    }
}
