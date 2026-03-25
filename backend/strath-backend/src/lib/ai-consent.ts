import { eq } from "drizzle-orm";

import { profiles } from "@/db/schema";
import { db } from "@/lib/db";

export const AI_CONSENT_REQUIRED_MESSAGE =
    "Allow AI features before using Wingman. You can review this in Settings.";

export async function getAiConsentState(userId: string) {
    const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        columns: {
            aiConsentGranted: true,
            aiConsentUpdatedAt: true,
        },
    });

    return {
        granted: Boolean(profile?.aiConsentGranted),
        updatedAt: profile?.aiConsentUpdatedAt ?? null,
    };
}

export async function hasAiConsent(userId: string) {
    const consent = await getAiConsentState(userId);
    return consent.granted;
}
