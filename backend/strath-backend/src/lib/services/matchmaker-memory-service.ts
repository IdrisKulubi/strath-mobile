import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import {
    matchmakerUserMemory,
    profileIntelligence,
    profiles,
} from "@/db/schema";
import { isMatchmakerPersonalizationV2EnabledForUser } from "@/lib/feature-flags";
import {
    buildFeedbackLearningPlan,
    type MatchmakerFeedbackLearningScope,
} from "@/lib/matchmaker/preference-domain";
import { sanitizeMatchmakerMemoryLabel } from "@/lib/matchmaker/feedback-domain";
import { syncConfirmedFeedbackPreferences } from "@/lib/services/matchmaker-preference-service";

export type MatchmakerFeedbackOutcome = "interested" | "passed" | "not_this_one" | "refinement";

type MemoryRow = typeof matchmakerUserMemory.$inferSelect;

const MAX_HISTORY = 50;
const MAX_SIGNALS = 30;

function normalizeSignal(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 48);
}

function addSignal(target: Record<string, number>, signal: string, delta: number) {
    const normalized = normalizeSignal(signal);
    if (!normalized) return;
    target[normalized] = Math.max(0, Math.min(10, Number((target[normalized] ?? 0) + delta)));
    if (target[normalized] <= 0.05) delete target[normalized];
}

function pruneSignals(signals: Record<string, number>) {
    return Object.fromEntries(
        Object.entries(signals)
            .filter(([, weight]) => weight > 0.05)
            .sort((left, right) => right[1] - left[1])
            .slice(0, MAX_SIGNALS),
    );
}

function topKeys(signals: Record<string, number>, limit = 5) {
    return Object.entries(signals)
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit)
        .map(([key]) => key.replace(/_/g, " "));
}

function displaySignal(key: string) {
    const display = key
        .replace(/^(avoid|prefer|interest|quality)\s+/, "")
        .replace(/\s+/g, " ")
        .trim();
    return sanitizeMatchmakerMemoryLabel(display);
}

function topDisplayLabels(signals: Record<string, number>, limit = 5) {
    return topKeys(signals, limit)
        .map(displaySignal)
        .filter((value): value is string => Boolean(value));
}

function summarizeMemory(positiveSignals: Record<string, number>, negativeSignals: Record<string, number>) {
    const likes = topDisplayLabels(positiveSignals, 4);
    const avoids = topDisplayLabels(negativeSignals, 4);
    const parts = [];
    if (likes.length > 0) parts.push(`Lean toward ${likes.join(", ")}.`);
    if (avoids.length > 0) parts.push(`Avoid ${avoids.join(", ")}.`);
    return parts.join(" ") || null;
}

function asStringArray(value: unknown) {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
}

function extractWordsFromText(text: string | null | undefined) {
    if (!text) return [];
    const wanted = [
        "calm",
        "chill",
        "serious",
        "intentional",
        "relationship",
        "funny",
        "social",
        "quiet",
        "creative",
        "ambitious",
        "active",
        "fitness",
        "music",
        "gaming",
        "fashion",
        "photography",
        "study",
        "church",
        "movies",
    ];
    const lowered = text.toLowerCase();
    return wanted.filter((word) => lowered.includes(word));
}

async function extractCandidateSignals(candidateUserId?: string | null) {
    if (!candidateUserId) return [];

    const [profile, intelligence] = await Promise.all([
        db.query.profiles.findFirst({
            where: eq(profiles.userId, candidateUserId),
            columns: {
                interests: true,
                qualities: true,
                lookingFor: true,
                personalityType: true,
                communicationStyle: true,
                workoutFrequency: true,
                drinkingPreference: true,
                smoking: true,
                aboutMe: true,
                bio: true,
            },
        }),
        db.query.profileIntelligence.findFirst({
            where: eq(profileIntelligence.userId, candidateUserId),
            columns: {
                profileSummary: true,
                searchText: true,
                traitTags: true,
                datingIntentTags: true,
                socialEnergyTags: true,
                lifestyleTags: true,
                interestTags: true,
                communicationTags: true,
                availabilityTags: true,
                dealbreakerTags: true,
                activityScore: true,
            },
        }),
    ]);

    if (!profile && !intelligence) return [];

    const signals = new Set<string>();
    for (const interest of asStringArray(profile?.interests)) signals.add(`interest:${interest}`);
    for (const quality of asStringArray(profile?.qualities)) signals.add(`quality:${quality}`);
    for (const value of [
        profile?.lookingFor,
        profile?.personalityType,
        profile?.communicationStyle,
        profile?.workoutFrequency,
        profile?.drinkingPreference,
        profile?.smoking,
    ]) {
        if (value) signals.add(value);
    }
    for (const word of extractWordsFromText([
        profile?.aboutMe,
        profile?.bio,
        intelligence?.profileSummary,
        intelligence?.searchText,
    ].filter(Boolean).join(" "))) {
        signals.add(word);
    }
    for (const tag of [
        ...asStringArray(intelligence?.traitTags),
        ...asStringArray(intelligence?.datingIntentTags),
        ...asStringArray(intelligence?.socialEnergyTags),
        ...asStringArray(intelligence?.lifestyleTags),
        ...asStringArray(intelligence?.interestTags),
        ...asStringArray(intelligence?.communicationTags),
        ...asStringArray(intelligence?.availabilityTags),
    ]) {
        signals.add(tag);
    }
    if ((intelligence?.activityScore ?? 0) >= 70) signals.add("active_recently");

    return [...signals].slice(0, 24);
}

export async function getMatchmakerUserMemory(userId: string) {
    return db.query.matchmakerUserMemory.findFirst({
        where: eq(matchmakerUserMemory.userId, userId),
    });
}

export function buildMatchmakerMemoryHint(memory: MemoryRow | null | undefined) {
    if (!memory) return "";
    const likes = topDisplayLabels(memory.positiveSignals ?? {}, 6);
    const avoids = topDisplayLabels(memory.negativeSignals ?? {}, 6);

    return [
        likes.length > 0 ? `Prioritize user's learned likes: ${likes.join(", ")}` : "",
        avoids.length > 0 ? `Avoid user's learned dislikes: ${avoids.join(", ")}` : "",
    ].filter(Boolean).join(". ");
}

export async function recordMatchmakerFeedback(input: {
    userId: string;
    candidateUserId?: string | null;
    outcome: MatchmakerFeedbackOutcome;
    reason?: string | null;
    learningScope?: MatchmakerFeedbackLearningScope;
    reasonCode?: string | null;
    shortlistId?: string | null;
    submissionId?: string | null;
    syncPreferences?: boolean;
    metadata?: Record<string, unknown>;
}) {
    const existing = await getMatchmakerUserMemory(input.userId);
    const positiveSignals = { ...(existing?.positiveSignals ?? {}) };
    const negativeSignals = { ...(existing?.negativeSignals ?? {}) };
    const candidateSignals = await extractCandidateSignals(input.candidateUserId);
    const learningPlan = buildFeedbackLearningPlan({
        outcome: input.outcome,
        reason: input.reason,
        candidateSignals,
        learningScope: input.learningScope,
    });
    const positiveDelta = input.outcome === "interested"
        ? 1
        : input.outcome === "refinement"
            ? 0.25
            : 0.5;
    const negativeDelta = input.outcome === "passed" ? 0.75 : 0.5;

    for (const signal of learningPlan.positiveSignals) {
        addSignal(positiveSignals, signal, positiveDelta);
    }
    for (const signal of learningPlan.negativeSignals) {
        addSignal(negativeSignals, signal, negativeDelta);
    }

    const nextPositiveSignals = pruneSignals(positiveSignals);
    const nextNegativeSignals = pruneSignals(negativeSignals);
    const historyItem = {
        candidateUserId: input.candidateUserId ?? undefined,
        outcome: input.outcome,
        reason: input.reason ?? undefined,
        reasonCode: input.reasonCode ?? undefined,
        shortlistId: input.shortlistId ?? undefined,
        submissionId: input.submissionId ?? undefined,
        learningScope: input.learningScope ?? "candidate_only",
        signals: learningPlan.historySignals.map(normalizeSignal).filter(Boolean).slice(0, 16),
        createdAt: new Date().toISOString(),
    };
    const feedbackHistory = [
        historyItem,
        ...(existing?.feedbackHistory ?? []),
    ].slice(0, MAX_HISTORY);
    const memorySummary = summarizeMemory(nextPositiveSignals, nextNegativeSignals);

    await db
        .insert(matchmakerUserMemory)
        .values({
            userId: input.userId,
            positiveSignals: nextPositiveSignals,
            negativeSignals: nextNegativeSignals,
            feedbackHistory,
            memorySummary,
            lastFeedbackAt: new Date(),
            updatedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: matchmakerUserMemory.userId,
            set: {
                positiveSignals: nextPositiveSignals,
                negativeSignals: nextNegativeSignals,
                feedbackHistory,
                memorySummary,
                lastFeedbackAt: new Date(),
                updatedAt: new Date(),
            },
        });

    if ((input.learningScope ?? "candidate_only") === "future_matches" && input.syncPreferences !== false) {
        const v2Enabled = await isMatchmakerPersonalizationV2EnabledForUser(input.userId);
        if (v2Enabled) {
            await syncConfirmedFeedbackPreferences({
                userId: input.userId,
                positiveSignals: learningPlan.positiveSignals,
                negativeSignals: learningPlan.negativeSignals,
                metadata: {
                    source: "matchmaker_feedback_compatibility_write",
                    outcome: input.outcome,
                    ...(input.metadata ?? {}),
                },
            });
        }
    }

    return {
        memorySummary,
        positiveSignals: nextPositiveSignals,
        negativeSignals: nextNegativeSignals,
        learningScope: input.learningScope ?? "candidate_only",
    };
}
