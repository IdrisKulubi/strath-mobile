import { eq } from "drizzle-orm";

import { appFeatureFlags } from "@/db/schema";
import { db } from "@/lib/db";

export const APP_FEATURE_KEYS = {
    demoLoginEnabled: "demo_login_enabled",
    signupCapEnabled: "signup_cap_enabled",
    adminMatchPreviewEnabled: "admin_match_preview_enabled",
    paymentsEnabled: "payments_enabled",
    rescheduleEnabled: "reschedule_enabled",
    matchmakerPersonalizationV2: "matchmaker_personalization_v2",
} as const;

// Default caps applied when the flag row is missing config or for any
// unexpected gender bucket. These mirror the defaults inserted by the
// 0008 migration.
export const DEFAULT_SIGNUP_CAP_CONFIG = {
    maxMale: 100,
    maxFemale: 100,
    maxOther: 20,
} as const;

export interface SignupCapConfig {
    maxMale: number;
    maxFemale: number;
    maxOther: number;
}

export const MATCHMAKER_V2_ROLLOUT_PERCENTAGES = [0, 5, 25, 50, 100] as const;
export type MatchmakerV2RolloutPercentage = typeof MATCHMAKER_V2_ROLLOUT_PERCENTAGES[number];
export const MATCHMAKER_DAILY_SEARCH_LIMIT_MIN = 1;
export const MATCHMAKER_DAILY_SEARCH_LIMIT_MAX = 10;
export const DEFAULT_MATCHMAKER_DAILY_SEARCH_LIMIT = Math.min(
    MATCHMAKER_DAILY_SEARCH_LIMIT_MAX,
    Math.max(
        MATCHMAKER_DAILY_SEARCH_LIMIT_MIN,
        Number.parseInt(process.env.MATCHMAKER_DAILY_SEARCH_LIMIT || "3", 10) || 3,
    ),
);

export interface MatchmakerV2RolloutConfig {
    percentage: MatchmakerV2RolloutPercentage;
    internalUserIds: string[];
    rollbackReady: boolean;
    stageStartedAt: string | null;
    dailySearchLimit: number;
}

export async function isFeatureEnabled(key: string, fallback = false) {
    const flag = await db.query.appFeatureFlags.findFirst({
        where: eq(appFeatureFlags.key, key),
    });

    return flag?.enabled ?? fallback;
}

export async function getFeatureFlag(key: string) {
    return db.query.appFeatureFlags.findFirst({
        where: eq(appFeatureFlags.key, key),
    });
}

export function parseMatchmakerV2RolloutConfig(config: unknown): MatchmakerV2RolloutConfig {
    const raw = config && typeof config === "object" && !Array.isArray(config) ? config as Record<string, unknown> : {};
    const requestedPercentage = Number(raw.percentage ?? 100);
    const percentage = MATCHMAKER_V2_ROLLOUT_PERCENTAGES.includes(requestedPercentage as MatchmakerV2RolloutPercentage)
        ? requestedPercentage as MatchmakerV2RolloutPercentage
        : 0;
    const internalUserIds = Array.isArray(raw.internalUserIds)
        ? [...new Set(raw.internalUserIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()))].slice(0, 500)
        : [];
    const stageStartedAt = typeof raw.stageStartedAt === "string" && !Number.isNaN(Date.parse(raw.stageStartedAt)) ? raw.stageStartedAt : null;
    const requestedDailySearchLimit = Number(raw.dailySearchLimit ?? DEFAULT_MATCHMAKER_DAILY_SEARCH_LIMIT);
    const dailySearchLimit = Number.isInteger(requestedDailySearchLimit)
        && requestedDailySearchLimit >= MATCHMAKER_DAILY_SEARCH_LIMIT_MIN
        && requestedDailySearchLimit <= MATCHMAKER_DAILY_SEARCH_LIMIT_MAX
        ? requestedDailySearchLimit
        : DEFAULT_MATCHMAKER_DAILY_SEARCH_LIMIT;
    return { percentage, internalUserIds, rollbackReady: raw.rollbackReady === true, stageStartedAt, dailySearchLimit };
}

export function stableRolloutBucket(userId: string) {
    let hash = 2166136261;
    for (let index = 0; index < userId.length; index += 1) {
        hash ^= userId.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 100;
}

export function isUserInMatchmakerV2Rollout(input: { masterEnabled: boolean; config: MatchmakerV2RolloutConfig; userId?: string | null }) {
    if (!input.masterEnabled) return false;
    if (input.userId && input.config.internalUserIds.includes(input.userId)) return true;
    if (!input.userId) return input.config.percentage === 100;
    return stableRolloutBucket(input.userId) < input.config.percentage;
}

export async function getMatchmakerV2Rollout(userId?: string | null) {
    const flag = await getFeatureFlag(APP_FEATURE_KEYS.matchmakerPersonalizationV2);
    const config = parseMatchmakerV2RolloutConfig(flag?.config);
    return {
        enabled: isUserInMatchmakerV2Rollout({ masterEnabled: flag?.enabled ?? false, config, userId }),
        masterEnabled: flag?.enabled ?? false,
        config,
        updatedAt: flag?.updatedAt ?? null,
    };
}

export async function isMatchmakerPersonalizationV2EnabledForUser(userId: string) {
    return (await getMatchmakerV2Rollout(userId)).enabled;
}

export async function getMatchmakerDailySearchLimit() {
    return (await getMatchmakerV2Rollout()).config.dailySearchLimit;
}

function parseNonNegativeInt(value: unknown, fallback: number) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return Math.floor(value);
    }
    if (typeof value === "string") {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return fallback;
}

export function parseSignupCapConfig(config: unknown): SignupCapConfig {
    const raw = (config ?? {}) as Record<string, unknown>;
    return {
        maxMale: parseNonNegativeInt(raw.maxMale, DEFAULT_SIGNUP_CAP_CONFIG.maxMale),
        maxFemale: parseNonNegativeInt(raw.maxFemale, DEFAULT_SIGNUP_CAP_CONFIG.maxFemale),
        maxOther: parseNonNegativeInt(raw.maxOther, DEFAULT_SIGNUP_CAP_CONFIG.maxOther),
    };
}

export async function getSignupCapFlag() {
    const flag = await getFeatureFlag(APP_FEATURE_KEYS.signupCapEnabled);
    return {
        enabled: flag?.enabled ?? false,
        config: parseSignupCapConfig(flag?.config),
        updatedAt: flag?.updatedAt ?? null,
    };
}

export async function getPublicFeatureFlags(userId?: string | null) {
    const [demoLoginEnabled, signupCapEnabled, paymentsEnabled, matchmakerV2Rollout] = await Promise.all([
        isFeatureEnabled(APP_FEATURE_KEYS.demoLoginEnabled, false),
        isFeatureEnabled(APP_FEATURE_KEYS.signupCapEnabled, false),
        isFeatureEnabled(APP_FEATURE_KEYS.paymentsEnabled, false),
        getMatchmakerV2Rollout(userId),
    ]);

    return {
        demoLoginEnabled,
        // Mobile clients use this to decide whether to show "limited release"
        // messaging during onboarding. Numbers are intentionally not exposed.
        signupCapEnabled,
        paymentsEnabled,
        matchmakerPersonalizationV2: matchmakerV2Rollout.enabled,
    };
}
