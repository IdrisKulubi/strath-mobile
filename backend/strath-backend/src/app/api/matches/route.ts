import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const userMatches = await db.query.matches.findMany({
            where: or(
                eq(matches.user1Id, session.user.id),
                eq(matches.user2Id, session.user.id)
            ),
            with: {
                user1: {
                    with: {
                        profile: true,
                    }
                },
                user2: {
                    with: {
                        profile: true,
                    }
                },
                messages: {
                    limit: 1,
                    orderBy: (messages, { desc }) => [desc(messages.createdAt)],
                }
            },
        });

        // Format matches for frontend
        const formattedMatches = userMatches.map((match) => {
            const isUser1 = match.user1Id === session.user.id;
            const partner = isUser1 ? match.user2 : match.user1;

            return {
                id: match.id,
                partner: {
                    id: partner.id,
                    name: partner.name,
                    image: partner.image,
                    profile: partner.profile
                },
                lastMessage: match.messages[0] || null,
                createdAt: match.createdAt,
            };
        });

        return successResponse(formattedMatches);
    } catch (error) {
        return errorResponse(error);
    }
}
