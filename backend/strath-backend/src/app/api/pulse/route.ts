/**
 * Campus Pulse API
 *
 * GET  /api/pulse          → paginated feed (newest first, not expired)
 * POST /api/pulse          → create a new anonymous post
 */
import { NextRequest } from "next/server";
import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { pulsePosts, pulseReactions, session as sessionTable } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
    validatePost,
    shouldFlagContent,
    formatPost,
    getPostExpiresAt,
    type PulseCategory,
} from "@/lib/services/pulse-service";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

// ─── Session helper ───────────────────────────────────────────────────────────

async function getSession(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session;
}

// ─── GET /api/pulse ───────────────────────────────────────────────────────────

/**
 * Query params:
 *   category  - filter by category
 *   page      - 0-based page number (default 0)
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const viewerId = session.user.id;

        const { searchParams } = req.nextUrl;
        const category = searchParams.get("category") ?? null;
        const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

        const now = new Date();

        // Build WHERE clause
        const conditions = [
            eq(pulsePosts.isHidden, false),
            or(isNull(pulsePosts.expiresAt), gt(pulsePosts.expiresAt, now)),
        ];
        if (category) {
            conditions.push(eq(pulsePosts.category, category as PulseCategory));
        }

        const posts = await db.query.pulsePosts.findMany({
            where: and(...conditions),
            orderBy: [desc(pulsePosts.createdAt)],
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
            with: {
                author: {
                    columns: { id: true, name: true, image: true, profilePhoto: true },
                },
            },
        });

        // Batch-fetch viewer reactions for all visible posts
        const postIds = posts.map((p) => p.id);
        const viewerReactions =
            postIds.length > 0
                ? await db.query.pulseReactions.findMany({
                      where: and(
                          eq(pulseReactions.userId, viewerId),
                          inArray(pulseReactions.postId, postIds)
                      ),
                  })
                : [];

        const reactionMap = new Map<string, string>();
        for (const r of viewerReactions) {
            reactionMap.set(r.postId, r.reaction);
        }

        const formatted = posts.map((post) =>
            formatPost(post, viewerId, (reactionMap.get(post.id) as any) ?? null)
        );

        return successResponse({
            posts: formatted,
            hasMore: formatted.length === PAGE_SIZE,
            page,
        });
    } catch (error) {
        console.error("GET /api/pulse error:", error);
        return errorResponse("Failed to fetch pulse feed", 500);
    }
}

// ─── POST /api/pulse ──────────────────────────────────────────────────────────

const createPostSchema = z.object({
    content: z.string().min(1).max(280),
    category: z.enum([
        "missed_connection",
        "campus_thought",
        "dating_rant",
        "hot_take",
        "looking_for",
        "general",
    ]),
    isAnonymous: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const authorId = session.user.id;

        const body = await req.json();
        const parsed = createPostSchema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error, 400);

        const { content, category, isAnonymous } = parsed.data;

        // Validate content + category
        try {
            validatePost(content, category);
        } catch (e: any) {
            return errorResponse(e.message, 400);
        }

        const isFlagged = shouldFlagContent(content);

        const [post] = await db
            .insert(pulsePosts)
            .values({
                authorId,
                content: content.trim(),
                category,
                isAnonymous,
                isFlagged,
                expiresAt: getPostExpiresAt(),
            })
            .returning();

        return successResponse({ post: formatPost({ ...post, author: null }, authorId, null) }, 201);
    } catch (error) {
        console.error("POST /api/pulse error:", error);
        return errorResponse("Failed to create post", 500);
    }
}

// ─── DELETE /api/pulse?postId=<id> ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        const postId = req.nextUrl.searchParams.get("postId");
        if (!postId) return errorResponse("postId required", 400);

        const post = await db.query.pulsePosts.findFirst({
            where: eq(pulsePosts.id, postId),
            columns: { authorId: true },
        });

        if (!post) return errorResponse("Post not found", 404);
        if (post.authorId !== userId) return errorResponse("Forbidden", 403);

        // Soft-hide to preserve reaction history; cron can hard-delete later
        await db
            .update(pulsePosts)
            .set({ isHidden: true })
            .where(eq(pulsePosts.id, postId));
        return successResponse({ deleted: true });
    } catch (error) {
        console.error("DELETE /api/pulse error:", error);
        return errorResponse("Failed to delete post", 500);
    }
}
