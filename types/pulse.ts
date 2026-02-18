// ─── Pulse Types ──────────────────────────────────────────────────────────────

export type ReactionType = "fire" | "skull" | "heart";

export type PulseCategory =
    | "missed_connection"
    | "campus_thought"
    | "dating_rant"
    | "hot_take"
    | "looking_for"
    | "general";

export interface PulseReactions {
    fire: number;
    skull: number;
    heart: number;
}

export interface PulseAuthor {
    id: string;
    name: string | null;
    image: string | null;
}

export interface PulsePost {
    id: string;
    content: string;
    category: PulseCategory;
    isAnonymous: boolean;
    /** Only present when the viewer is the owner, or the post is public */
    author: PulseAuthor | null;
    isOwner: boolean;
    reactions: PulseReactions;
    /** The reaction the current viewer has placed, or null */
    userReaction: ReactionType | null;
    revealCount: number;
    viewerRequestedReveal: boolean;
    expiresAt: string | null;
    createdAt: string;
    isFlagged: boolean;
}

export interface PulseFeedResponse {
    posts: PulsePost[];
    hasMore: boolean;
    page: number;
}

export interface RevealProfile {
    id: string;
    name: string | null;
    image: string | null;
    profilePhoto: string | null;
}

export interface RevealResponse {
    requested: boolean;
    mutual: boolean;
    revealCount: number;
    requesterProfile: RevealProfile | null;
    authorProfile: RevealProfile | null;
}

export const CATEGORY_LABELS: Record<PulseCategory, string> = {
    missed_connection: "Missed Connection",
    campus_thought: "Campus Thought",
    dating_rant: "Dating Rant",
    hot_take: "Hot Take",
    looking_for: "Looking For",
    general: "General",
};

export const CATEGORY_EMOJIS: Record<PulseCategory, string> = {
    missed_connection: "💌",
    campus_thought: "🤔",
    dating_rant: "😤",
    hot_take: "🔥",
    looking_for: "👀",
    general: "💬",
};

export const REACTION_EMOJIS: Record<ReactionType, string> = {
    fire: "🔥",
    skull: "💀",
    heart: "🫶",
};
