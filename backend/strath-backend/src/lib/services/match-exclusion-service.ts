import { eq, or, sql } from "drizzle-orm";

import { db as readDb } from "@/lib/db";
import { profiles, user } from "@/db/schema";
import { APP_FEATURE_KEYS, isFeatureEnabled } from "@/lib/feature-flags";

/**
 * Accounts that must never participate in automated daily introductions or
 * swipe-based mutual matches (team / admin testing).
 *
 * Extend via env `MATCH_EXCLUDED_FROM_POOL_EMAILS` (comma-separated, case-insensitive).
 * Any `user.role === "admin"` or `profiles.role === "admin"` is also excluded.
 */
const DEFAULT_EXCLUDED_MATCH_EMAILS = ["kulubiidris@gmail.com", "maria.muthoni@strathmore.edu", "jasminemaria784@gmail.com"] as const;

function parseExtraExcludedEmailsFromEnv(): string[] {
    const raw = process.env.MATCH_EXCLUDED_FROM_POOL_EMAILS?.trim();
    if (!raw) return [];
    return raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

/**
 * User IDs excluded from being shown as candidates, from receiving new candidate
 * pairs, and from creating mutual matches via swipe when the other side is
 * involved (see swipe route).
 */
export async function resolveMatchExcludedUserIds(): Promise<Set<string>> {
    const emailSet = new Set<string>([
        ...DEFAULT_EXCLUDED_MATCH_EMAILS.map((e) => e.toLowerCase()),
        ...parseExtraExcludedEmailsFromEnv(),
    ]);
    const emailList = [...emailSet];

    const out = new Set<string>();

    if (emailList.length > 0) {
        const byEmail = await readDb
            .select({ id: user.id })
            .from(user)
            .where(or(...emailList.map((email) => sql`lower(${user.email}) = ${email}`)));
        for (const row of byEmail) {
            out.add(row.id);
        }
    }

    const adminUsers = await readDb.select({ id: user.id }).from(user).where(eq(user.role, "admin"));
    for (const row of adminUsers) {
        out.add(row.id);
    }

    const adminProfiles = await readDb.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.role, "admin"));
    for (const row of adminProfiles) {
        out.add(row.userId);
    }

    return out;
}

export async function isAdminMatchPreviewUser(userId: string): Promise<boolean> {
    const enabled = await isFeatureEnabled(APP_FEATURE_KEYS.adminMatchPreviewEnabled, false);
    if (!enabled) return false;

    const [userRow, profileRow] = await Promise.all([
        readDb.query.user.findFirst({
            where: eq(user.id, userId),
            columns: { role: true },
        }),
        readDb.query.profiles.findFirst({
            where: eq(profiles.userId, userId),
            columns: { role: true },
        }),
    ]);

    return userRow?.role === "admin" || profileRow?.role === "admin";
}
