import { eq } from "drizzle-orm";

import { appFeatureFlags } from "@/db/schema";
import { db } from "@/lib/db";

export const APP_FEATURE_KEYS = {
    demoLoginEnabled: "demo_login_enabled",
    paymentsEnabled: "payments_enabled",
} as const;

export async function isFeatureEnabled(key: string, fallback = false) {
    const flag = await db.query.appFeatureFlags.findFirst({
        where: eq(appFeatureFlags.key, key),
    });

    return flag?.enabled ?? fallback;
}

export async function isPaymentsEnabled() {
    return isFeatureEnabled(APP_FEATURE_KEYS.paymentsEnabled, false);
}

export async function getPublicFeatureFlags() {
    const [demoLoginEnabled, paymentsEnabled] = await Promise.all([
        isFeatureEnabled(APP_FEATURE_KEYS.demoLoginEnabled, false),
        isFeatureEnabled(APP_FEATURE_KEYS.paymentsEnabled, false),
    ]);

    return {
        demoLoginEnabled,
        paymentsEnabled,
    };
}
