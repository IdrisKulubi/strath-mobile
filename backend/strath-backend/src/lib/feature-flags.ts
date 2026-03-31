import { eq } from "drizzle-orm";

import { appFeatureFlags } from "@/db/schema";
import { db } from "@/lib/db";

export const APP_FEATURE_KEYS = {
    demoLoginEnabled: "demo_login_enabled",
} as const;

export async function isFeatureEnabled(key: string, fallback = false) {
    const flag = await db.query.appFeatureFlags.findFirst({
        where: eq(appFeatureFlags.key, key),
    });

    return flag?.enabled ?? fallback;
}

export async function getPublicFeatureFlags() {
    const demoLoginEnabled = await isFeatureEnabled(APP_FEATURE_KEYS.demoLoginEnabled, false);

    return {
        demoLoginEnabled,
    };
}
