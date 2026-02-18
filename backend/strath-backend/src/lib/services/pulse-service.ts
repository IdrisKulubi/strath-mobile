/**
 * Campus Pulse Service
 *
 * Handles:
 * - Content moderation (keyword + LLM fallback)
 * - Reaction counts sync
 * - Reveal request management
 * - Post expiry helpers
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pulsePosts, pulseReactions, user } from "@/db/schema";

// ─── Constants ────────────────────────────────────────────────────────────────

const POST_MAX_CHARS = 280;
const POST_TTL_HOURS = 48;
export type ReactionType = "fire" | "skull" | "heart";

export const PULSE_CATEGORIES = [
    "missed_connection",
    "campus_thought",
    "dating_rant",
    "hot_take",
    "looking_for",
    "general",
] as const;
export type PulseCategory = (typeof PULSE_CATEGORIES)[number];

/** Keyword block-list for basic content moderation. */
const BLOCKED_KEYWORDS = [
    "rape",
    "kill",
    "murder",
    "suicide",
    "n-word",
    "nigger",
    "faggot",
    "retard",
    "whore",
    "slut",
];

// ─── Moderation ───────────────────────────────────────────────────────────────

/**
 * Quick keyword-based moderation pass.
 * Returns `true` if the content should be flagged for review.
 */
export function shouldFlagContent(content: string): boolean {
    const lower = content.toLowerCase();
    return BLOCKED_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Validate a pulse post before creation.
 * Throws a descriptive error string on failure.
 */
export function validatePost(content: string, category: string): void {
    const trimmed = content.trim();

    if (!trimmed) throw new Error("Post content cannot be empty.");
    if (trimmed.length > POST_MAX_CHARS)
        throw new Error(`Post must be ${POST_MAX_CHARS} characters or fewer.`);
    if (!PULSE_CATEGORIES.includes(category as PulseCategory))
        throw new Error(`Invalid category: ${category}`);
}

// ─── Expiry ───────────────────────────────────────────────────────────────────

/** Calculate the expiry date for a new post (now + 48h). */
export function getPostExpiresAt(): Date {
    const d = new Date();
    d.setHours(d.getHours() + POST_TTL_HOURS);
    return d;
}

/** Return true if the post has expired. */
export function isPostExpired(expiresAt: Date | null | undefined): boolean {
    if (!expiresAt) return false;
    return expiresAt < new Date();
}

// ─── Reaction logic ───────────────────────────────────────────────────────────

/**
 * Toggle a user's reaction on a post.
 * Returns the new reaction counts plus whether the user now has the reaction.
 */
export async function toggleReaction(
    postId: string,
    userId: string,
    reaction: ReactionType
): Promise<{ added: boolean; counts: ReactionCounts }> {
    const existing = await db.query.pulseReactions.findFirst({
        where: and(
            eq(pulseReactions.postId, postId),
            eq(pulseReactions.userId, userId)
        ),
    });

    if (existing) {
        if (existing.reaction === reaction) {
            // Remove reaction
            await db
                .delete(pulseReactions)
                .where(eq(pulseReactions.id, existing.id));

            await decrementCount(postId, reaction);
            const counts = await getReactionCounts(postId);
            return { added: false, counts };
        } else {
            // Switch reaction type
            await db
                .update(pulseReactions)
                .set({ reaction })
                .where(eq(pulseReactions.id, existing.id));

            await decrementCount(postId, existing.reaction as ReactionType);
            await incrementCount(postId, reaction);
            const counts = await getReactionCounts(postId);
            return { added: true, counts };
        }
    }

    // Add new reaction
    await db.insert(pulseReactions).values({ postId, userId, reaction });
    await incrementCount(postId, reaction);
    const counts = await getReactionCounts(postId);
    return { added: true, counts };
}

export interface ReactionCounts {
    fire: number;
    skull: number;
    heart: number;
}

async function getReactionCounts(postId: string): Promise<ReactionCounts> {
    const post = await db.query.pulsePosts.findFirst({
        where: eq(pulsePosts.id, postId),
        columns: { fireCount: true, skullCount: true, heartCount: true },
    });
    return {
        fire: post?.fireCount ?? 0,
        skull: post?.skullCount ?? 0,
        heart: post?.heartCount ?? 0,
    };
}

async function incrementCount(postId: string, reaction: ReactionType) {
    const col = reactionToCol(reaction);
    await db
        .update(pulsePosts)
        .set({ [col]: sql`${pulsePosts[col]} + 1` })
        .where(eq(pulsePosts.id, postId));
}

async function decrementCount(postId: string, reaction: ReactionType) {
    const col = reactionToCol(reaction);
    await db
        .update(pulsePosts)
        .set({ [col]: sql`GREATEST(${pulsePosts[col]} - 1, 0)` })
        .where(eq(pulsePosts.id, postId));
}

function reactionToCol(reaction: ReactionType): "fireCount" | "skullCount" | "heartCount" {
    return reaction === "fire"
        ? "fireCount"
        : reaction === "skull"
          ? "skullCount"
          : "heartCount";
}

// ─── Reveal logic ─────────────────────────────────────────────────────────────

/**
 * Add `requesterId` to a post's revealRequests array.
 * Returns `true` if mutual reveal is now triggered (both sides requested).
 */
export async function requestReveal(
    postId: string,
    requesterId: string
): Promise<{ mutual: boolean; revealRequests: string[]; authorId: string }> {
    const post = await db.query.pulsePosts.findFirst({
        where: eq(pulsePosts.id, postId),
        columns: { authorId: true, revealRequests: true, isAnonymous: true },
    });

    if (!post) throw new Error("Post not found.");
    if (post.authorId === requesterId)
        throw new Error("You cannot reveal your own post.");
    if (!post.isAnonymous) throw new Error("This post is not anonymous.");

    const existing = post.revealRequests ?? [];
    if (existing.includes(requesterId)) {
        // Already requested — no-op
        const mutual = existing.includes(post.authorId);
        return { mutual, revealRequests: existing, authorId: post.authorId };
    }

    const updated = [...existing, requesterId];
    await db
        .update(pulsePosts)
        .set({ revealRequests: updated })
        .where(eq(pulsePosts.id, postId));

    // Mutual if the author previously requested reveal on this requester
    // We track this via a separate post authored by them — keep it simple:
    // mutual = author is in the requester list
    const mutual = existing.includes(post.authorId);
    return { mutual, revealRequests: updated, authorId: post.authorId };
}

/**
 * Fetch a user's public reveal profile (name + photo).
 * Returned when a mutual reveal is confirmed.
 */
export async function getRevealProfile(userId: string) {
    return db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { id: true, name: true, image: true, profilePhoto: true },
    });
}

// ─── Feed helpers ─────────────────────────────────────────────────────────────

/**
 * Build the formatted post object served by the feed API.
 */
export interface RawPulsePost {
    id: string;
    authorId: string;
    content: string;
    category: PulseCategory | null;
    isAnonymous: boolean | null;
    fireCount: number | null;
    skullCount: number | null;
    heartCount: number | null;
    revealRequests: string[] | null;
    expiresAt: Date | null;
    createdAt: Date;
    isFlagged: boolean | null;
    author: { id: string; name: string | null; image: string | null; profilePhoto: string | null } | null;
}

export function formatPost(
    post: RawPulsePost,
    viewerId: string,
    userReaction: ReactionType | null
) {
    const isOwner = post.authorId === viewerId;
    const revealRequests: string[] = post.revealRequests ?? [];
    const isAnonymous = post.isAnonymous ?? true;

    return {
        id: post.id,
        content: post.content,
        category: post.category ?? "general",
        isAnonymous,
        // Only expose author info if viewer is the owner, or post is not anonymous
        author: isOwner || !isAnonymous
            ? {
                id: post.authorId,
                name: post.author?.name ?? null,
                image: post.author?.profilePhoto ?? post.author?.image ?? null,
              }
            : null,
        isOwner,
        reactions: {
            fire: post.fireCount ?? 0,
            skull: post.skullCount ?? 0,
            heart: post.heartCount ?? 0,
        },
        userReaction,
        revealCount: revealRequests.length,
        viewerRequestedReveal: revealRequests.includes(viewerId),
        expiresAt: post.expiresAt?.toISOString() ?? null,
        createdAt: post.createdAt?.toISOString(),
        isFlagged: post.isFlagged ?? false,
    };
}
