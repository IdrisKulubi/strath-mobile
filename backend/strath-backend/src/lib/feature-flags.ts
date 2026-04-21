import { eq } from "drizzle-orm";

import { appFeatureFlags } from "@/db/schema";
import { db } from "@/lib/db";

export const APP_FEATURE_KEYS = {
    demoLoginEnabled: "demo_login_enabled",
    signupCapEnabled: "signup_cap_enabled",
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

export async function getPublicFeatureFlags() {
    const demoLoginEnabled = await isFeatureEnabled(APP_FEATURE_KEYS.demoLoginEnabled, false);
    const signupCapEnabled = await isFeatureEnabled(APP_FEATURE_KEYS.signupCapEnabled, false);

    return {
        demoLoginEnabled,
        // Mobile clients use this to decide whether to show "limited release"
        // messaging during onboarding. Numbers are intentionally not exposed.
        signupCapEnabled,
    };
}
