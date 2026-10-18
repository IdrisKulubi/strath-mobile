import { eq, or, sql } from "drizzle-orm";

import { db as readDb } from "@/lib/db";
import { profiles, user } from "@/db/schema";
import { APP_FEATURE_KEYS, isFeatureEnabled } from "@/lib/feature-flags";
import { redis } from "@/lib/redis";

/**
 * Accounts that must never participate in automated daily introductions or
 * swipe-based mutual matches (team / admin testing).
 *
 * Extend via env `MATCH_EXCLUDED_FROM_POOL_EMAILS` (comma-separated, case-insensitive).
 * Any `user.role === "admin"` or `profiles.role === "admin"` is also excluded.
 */
const DEFAULT_EXCLUDED_MATCH_EMAILS = ["kulubiidris@gmail.com", "maria.muthoni@strathmore.edu", "jasminemaria784@gmail.com"] as const;

const MATCH_EXCLUDED_CACHE_KEY = "match:excluded-user-ids";
const MATCH_EXCLUDED_TTL_SECONDS = 15 * 60;

let memoryCache: { ids: string[]; expiresAt: number } | null = null;

function parseExtraExcludedEmailsFromEnv(): string[] {
    const raw = process.env.MATCH_EXCLUDED_FROM_POOL_EMAILS?.trim();
    if (!raw) return [];
    return raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

async function loadMatchExcludedUserIdsFromDb(): Promise<Set<string>> {
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

export async function invalidateMatchExcludedUserIdsCache(): Promise<void> {
    memoryCache = null;
    try {
        await redis.del(MATCH_EXCLUDED_CACHE_KEY);
    } catch (error) {
        console.warn("[match-exclusion] failed to invalidate redis cache", error);
    }
}

/**
 * User IDs excluded from being shown as candidates, from receiving new candidate
 * pairs, and from creating mutual matches via swipe when the other side is
 * involved (see swipe route).
 */
export async function resolveMatchExcludedUserIds(): Promise<Set<string>> {
    const now = Date.now();

    if (memoryCache && memoryCache.expiresAt > now) {
        return new Set(memoryCache.ids);
    }

    try {
        const cached = await redis.get<string[]>(MATCH_EXCLUDED_CACHE_KEY);
        if (Array.isArray(cached) && cached.length >= 0) {
            memoryCache = {
                ids: cached,
                expiresAt: now + MATCH_EXCLUDED_TTL_SECONDS * 1000,
            };
            return new Set(cached);
        }
    } catch (error) {
        console.warn("[match-exclusion] redis cache read failed", error);
    }

    const out = await loadMatchExcludedUserIdsFromDb();
    const ids = [...out];
    memoryCache = {
        ids,
        expiresAt: now + MATCH_EXCLUDED_TTL_SECONDS * 1000,
    };

    try {
        await redis.set(MATCH_EXCLUDED_CACHE_KEY, ids, { ex: MATCH_EXCLUDED_TTL_SECONDS });
    } catch (error) {
        console.warn("[match-exclusion] redis cache write failed", error);
    }

    return out;
}

export type MatchExclusionContext = {
    matchExcludedUserIds: Set<string>;
    sessionUserRole?: string | null;
};

export async function createMatchExclusionContext(sessionUserRole?: string | null): Promise<MatchExclusionContext> {
    const matchExcludedUserIds = await resolveMatchExcludedUserIds();
    return { matchExcludedUserIds, sessionUserRole };
}

export async function isAdminMatchPreviewUser(
    userId: string,
    options?: { sessionUserRole?: string | null },
): Promise<boolean> {
    const enabled = await isFeatureEnabled(APP_FEATURE_KEYS.adminMatchPreviewEnabled, false);
    if (!enabled) return false;

    if (options?.sessionUserRole === "admin") {
        return true;
    }

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
