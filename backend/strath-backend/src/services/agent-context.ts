import { db } from "../lib/db";
import { agentContext } from "../db/schema";
import { eq } from "drizzle-orm";
import type { ParsedIntent } from "./intent-parser";

// ============================================
// AGENT CONTEXT SERVICE (Wingman Memory)
// ============================================
// Manages the AI wingman's persistent memory per user.
// Tracks: query history, learned preferences, match feedback.
//
// This makes the wingman smarter over time — it remembers what
// types of people the user likes and adjusts recommendations.

const MAX_QUERY_HISTORY = 20;
const MAX_FEEDBACK_HISTORY = 50;

export interface AgentContextData {
    learnedPreferences: Record<string, number>;
    queryHistory: {
        query: string;
        timestamp: string;
        matchedIds: string[];
        feedback?: string;
    }[];
    matchFeedback: {
        matchedUserId: string;
        outcome: "amazing" | "nice" | "meh" | "not_for_me";
        date: string;
    }[];
    lastAgentMessage: string | null;
}

/**
 * Get or create the agent context for a user.
 */
export async function getAgentContext(userId: string): Promise<AgentContextData> {
    let ctx = await db.query.agentContext.findFirst({
        where: eq(agentContext.userId, userId),
    });

    if (!ctx) {
        // Create new context
        const [newCtx] = await db.insert(agentContext).values({
            userId,
            learnedPreferences: {},
            queryHistory: [],
            matchFeedback: [],
        }).returning();
        ctx = newCtx;
    }

    return {
        learnedPreferences: (ctx.learnedPreferences as Record<string, number>) || {},
        queryHistory: (ctx.queryHistory as AgentContextData["queryHistory"]) || [],
        matchFeedback: (ctx.matchFeedback as AgentContextData["matchFeedback"]) || [],
        lastAgentMessage: ctx.lastAgentMessage,
    };
}

/**
 * Record a search query in the agent's memory.
 */
export async function recordQuery(
    userId: string,
    query: string,
    matchedUserIds: string[],
): Promise<void> {
    const ctx = await getAgentContext(userId);

    const newEntry = {
        query,
        timestamp: new Date().toISOString(),
        matchedIds: matchedUserIds.slice(0, 10), // Store top 10 match IDs
    };

    // Prepend new query, keep last N
    const updatedHistory = [newEntry, ...ctx.queryHistory].slice(0, MAX_QUERY_HISTORY);

    await db.update(agentContext)
        .set({
            queryHistory: updatedHistory,
            updatedAt: new Date(),
        })
        .where(eq(agentContext.userId, userId));
}

/**
 * Record feedback on a match (swipe right/left, chat quality, etc.)
 * This is used to learn user preferences over time.
 */
export async function recordMatchFeedback(
    userId: string,
    matchedUserId: string,
    outcome: "amazing" | "nice" | "meh" | "not_for_me",
): Promise<void> {
    const ctx = await getAgentContext(userId);

    const newFeedback = {
        matchedUserId,
        outcome,
        date: new Date().toISOString(),
    };

    const updatedFeedback = [newFeedback, ...ctx.matchFeedback].slice(0, MAX_FEEDBACK_HISTORY);

    // Also update learned preferences based on feedback
    const updatedPreferences = await updateLearnedPreferences(
        ctx.learnedPreferences,
        matchedUserId,
        outcome,
    );

    await db.update(agentContext)
        .set({
            matchFeedback: updatedFeedback,
            learnedPreferences: updatedPreferences,
            updatedAt: new Date(),
        })
        .where(eq(agentContext.userId, userId));
}

/**
 * Update learned preferences based on match feedback.
 * Positive feedback on a profile → boost similar traits.
 * Negative feedback → reduce similar traits.
 */
async function updateLearnedPreferences(
    currentPreferences: Record<string, number>,
    matchedUserId: string,
    outcome: "amazing" | "nice" | "meh" | "not_for_me",
): Promise<Record<string, number>> {
    const prefs = { ...currentPreferences };

    // Fetch the matched user's profile to extract traits
    const matchedProfile = await db.query.profiles.findFirst({
        where: eq(
            (await import("../db/schema")).profiles.userId,
            matchedUserId,
        ),
    });

    if (!matchedProfile) return prefs;

    // Determine weight based on outcome
    const weight = {
        amazing: 0.3,
        nice: 0.1,
        meh: -0.05,
        not_for_me: -0.2,
    }[outcome];

    // Extract traits from the matched profile and adjust weights
    const traits = extractTraits(matchedProfile);
    for (const trait of traits) {
        prefs[trait] = Math.min(1, Math.max(-1, (prefs[trait] || 0) + weight));
    }

    // Clean up near-zero preferences
    for (const [key, value] of Object.entries(prefs)) {
        if (Math.abs(value) < 0.02) delete prefs[key];
    }

    return prefs;
}

/**
 * Extract trait keywords from a profile for preference learning.
 */
function extractTraits(profile: Record<string, unknown>): string[] {
    const traits: string[] = [];

    // Personality type
    if (profile.personalityType) {
        traits.push(`personality_${String(profile.personalityType).toLowerCase()}`);
    }

    // Communication style
    if (profile.communicationStyle) {
        traits.push(`communication_${String(profile.communicationStyle).toLowerCase()}`);
    }

    // Love language
    if (profile.loveLanguage) {
        traits.push(`love_language_${String(profile.loveLanguage).toLowerCase()}`);
    }

    // Interests (top 5)
    const interests = (profile.interests as string[] | null) || [];
    for (const interest of interests.slice(0, 5)) {
        traits.push(`interest_${interest.toLowerCase().replace(/\s+/g, "_")}`);
    }

    // Lifestyle
    if (profile.smoking) traits.push(`smoking_${String(profile.smoking).toLowerCase()}`);
    if (profile.drinkingPreference) traits.push(`drinking_${String(profile.drinkingPreference).toLowerCase()}`);
    if (profile.workoutFrequency) traits.push(`workout_${String(profile.workoutFrequency).toLowerCase()}`);

    // Course/field
    if (profile.course) {
        traits.push(`course_${String(profile.course).toLowerCase().replace(/\s+/g, "_")}`);
    }

    // Year
    if (profile.yearOfStudy) {
        traits.push(`year_${profile.yearOfStudy}`);
    }

    return traits;
}

/**
 * Save the wingman's last message for continuity.
 */
export async function saveAgentMessage(userId: string, message: string): Promise<void> {
    await db.update(agentContext)
        .set({
            lastAgentMessage: message,
            updatedAt: new Date(),
        })
        .where(eq(agentContext.userId, userId));
}

/**
 * Get the previous intent from query history (most recent).
 * Used for refinement detection.
 */
export function getPreviousQuery(ctx: AgentContextData): string | null {
    if (ctx.queryHistory.length === 0) return null;
    return ctx.queryHistory[0].query;
}
