import { and, asc, count, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { profiles, user } from "@/db/schema";
import { db } from "@/lib/db";
import { getSignupCapFlag, parseSignupCapConfig, type SignupCapConfig } from "@/lib/feature-flags";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { sendPushNotification } from "@/lib/notifications";

export type GenderBucket = "male" | "female" | "other";
export type WaitlistStatus = "admitted" | "waitlisted";

export interface AdmissionResult {
    status: WaitlistStatus;
    position: number | null;
}

export interface AdmissionStats {
    admitted: Record<GenderBucket, number>;
    waitlisted: Record<GenderBucket, number>;
    caps: SignupCapConfig;
    enabled: boolean;
}

/**
 * Normalize any gender value coming from the profile into one of the three
 * buckets the cap logic reasons about. Anything that isn't literally
 * "male"/"female" (case-insensitive) falls into the "other" pool — this also
 * protects us if a future gender option is added without updating this file.
 */
export function normalizeGenderBucket(gender: string | null | undefined): GenderBucket {
    const normalized = (gender ?? "").trim().toLowerCase();
    if (normalized === "male") return "male";
    if (normalized === "female") return "female";
    return "other";
}

function maxForBucket(config: SignupCapConfig, bucket: GenderBucket) {
    if (bucket === "male") return config.maxMale;
    if (bucket === "female") return config.maxFemale;
    return config.maxOther;
}

/**
 * Decide whether a user who just finished onboarding should be admitted or
 * placed on the waitlist, and persist that decision.
 *
 * Idempotent: if the user already has a waitlist status, this simply returns
 * the existing one — safe to call on every profile save.
 *
 * Race-safety note: we wrap the read-then-write in a transaction, but because
 * we use neon-http (READ COMMITTED) the cap is best-effort. In the worst case
 * two near-simultaneous requests can both admit, so the actual admitted count
 * may overshoot the configured cap by the number of concurrent finishers. For
 * a soft launch this is totally acceptable — "100-ish" is fine.
 */
export async function admitOrWaitlist(userId: string): Promise<AdmissionResult> {
    const capFlag = await getSignupCapFlag();

    return db.transaction(async (tx) => {
        const profile = await tx.query.profiles.findFirst({
            where: eq(profiles.userId, userId),
            columns: {
                id: true,
                userId: true,
                gender: true,
                waitlistStatus: true,
                waitlistPosition: true,
            },
        });

        if (!profile) {
            throw new Error(`Cannot run admission for unknown profile: ${userId}`);
        }

        // Already decided — idempotent return.
        if (profile.waitlistStatus === "admitted") {
            return { status: "admitted", position: null };
        }
        if (profile.waitlistStatus === "waitlisted") {
            return { status: "waitlisted", position: profile.waitlistPosition ?? null };
        }

        // Cap is off → admit everyone.
        if (!capFlag.enabled) {
            await tx
                .update(profiles)
                .set({
                    waitlistStatus: "admitted",
                    waitlistPosition: null,
                    admittedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(profiles.userId, userId));
            return { status: "admitted", position: null };
        }

        const bucket = normalizeGenderBucket(profile.gender);
        const max = maxForBucket(capFlag.config, bucket);

        const [{ admittedCount }] = await tx
            .select({ admittedCount: count() })
            .from(profiles)
            .where(and(eq(profiles.waitlistStatus, "admitted"), eq(profiles.gender, profile.gender ?? "")));

        if (admittedCount < max) {
            await tx
                .update(profiles)
                .set({
                    waitlistStatus: "admitted",
                    waitlistPosition: null,
                    admittedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(profiles.userId, userId));
            return { status: "admitted", position: null };
        }

        // Cap reached — put them on the waitlist at the tail of their gender queue.
        const [{ maxPos }] = await tx
            .select({ maxPos: sql<number | null>`max(${profiles.waitlistPosition})` })
            .from(profiles)
            .where(
                and(
                    eq(profiles.waitlistStatus, "waitlisted"),
                    eq(profiles.gender, profile.gender ?? ""),
                ),
            );
        const nextPosition = (maxPos ?? 0) + 1;

        await tx
            .update(profiles)
            .set({
                waitlistStatus: "waitlisted",
                waitlistPosition: nextPosition,
                admittedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(profiles.userId, userId));

        return { status: "waitlisted", position: nextPosition };
    });
}

/**
 * Snapshot of per-bucket admitted/waitlisted counts for the admin dashboard.
 */
export async function getAdmissionStats(): Promise<AdmissionStats> {
    const capFlag = await getSignupCapFlag();

    const rows = await db
        .select({
            status: profiles.waitlistStatus,
            gender: profiles.gender,
            cnt: count(),
        })
        .from(profiles)
        .where(isNotNull(profiles.waitlistStatus))
        .groupBy(profiles.waitlistStatus, profiles.gender);

    const admitted: Record<GenderBucket, number> = { male: 0, female: 0, other: 0 };
    const waitlisted: Record<GenderBucket, number> = { male: 0, female: 0, other: 0 };

    for (const row of rows) {
        const bucket = normalizeGenderBucket(row.gender);
        if (row.status === "admitted") admitted[bucket] += row.cnt;
        else if (row.status === "waitlisted") waitlisted[bucket] += row.cnt;
    }

    return {
        admitted,
        waitlisted,
        caps: capFlag.config,
        enabled: capFlag.enabled,
    };
}

export interface ReleaseResult {
    released: number;
    userIds: string[];
}

/**
 * Promote the top `count` users of a given gender bucket from waitlisted to
 * admitted, in FIFO order by waitlist_position. Sends a push notification to
 * each newly-admitted user ("You're in!").
 *
 * If `bucket` is omitted, releases across all buckets proportionally (simple
 * round-robin by smallest position across buckets).
 */
export async function releaseFromWaitlist(
    countToRelease: number,
    bucket?: GenderBucket,
): Promise<ReleaseResult> {
    if (countToRelease <= 0) return { released: 0, userIds: [] };

    const candidates = await db
        .select({
            userId: profiles.userId,
            position: profiles.waitlistPosition,
            gender: profiles.gender,
        })
        .from(profiles)
        .where(
            bucket
                ? and(
                      eq(profiles.waitlistStatus, "waitlisted"),
                      eq(profiles.gender, bucket),
                  )
                : eq(profiles.waitlistStatus, "waitlisted"),
        )
        .orderBy(asc(profiles.waitlistPosition))
        .limit(countToRelease);

    if (candidates.length === 0) return { released: 0, userIds: [] };

    const now = new Date();
    const userIds = candidates.map((c) => c.userId);

    await db
        .update(profiles)
        .set({
            waitlistStatus: "admitted",
            waitlistPosition: null,
            admittedAt: now,
            updatedAt: now,
        })
        .where(
            sql`${profiles.userId} IN (${sql.join(
                userIds.map((id) => sql`${id}`),
                sql`, `,
            )})`,
        );

    // Fire-and-forget push notifications — don't block the release on delivery.
    notifyAdmittedUsers(userIds).catch((err) => {
        console.error("[admission-service] Failed to notify admitted users:", err);
    });

    return { released: candidates.length, userIds };
}

/**
 * Flip the cap off AND admit every currently waitlisted user. Used by the
 * "Open to everyone" button.
 */
export async function admitEveryoneFromWaitlist(): Promise<ReleaseResult> {
    const waitlistedUsers = await db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(eq(profiles.waitlistStatus, "waitlisted"));

    if (waitlistedUsers.length === 0) return { released: 0, userIds: [] };

    const userIds = waitlistedUsers.map((u) => u.userId);
    const now = new Date();

    await db
        .update(profiles)
        .set({
            waitlistStatus: "admitted",
            waitlistPosition: null,
            admittedAt: now,
            updatedAt: now,
        })
        .where(eq(profiles.waitlistStatus, "waitlisted"));

    notifyAdmittedUsers(userIds).catch((err) => {
        console.error("[admission-service] Failed to notify admitted users:", err);
    });

    return { released: waitlistedUsers.length, userIds };
}

async function notifyAdmittedUsers(userIds: string[]) {
    if (userIds.length === 0) return;

    const tokens = await db
        .select({ pushToken: user.pushToken })
        .from(user)
        .where(
            and(
                isNotNull(user.pushToken),
                sql`${user.id} IN (${sql.join(
                    userIds.map((id) => sql`${id}`),
                    sql`, `,
                )})`,
            ),
        );

    await Promise.all(
        tokens
            .filter((t) => t.pushToken)
            .map((t) =>
                sendPushNotification(t.pushToken as string, {
                    title: "You're in 💛",
                    body: "A spot opened up on Strathspace. Tap to meet your first match.",
                    data: { type: NOTIFICATION_TYPES.ADMITTED_FROM_WAITLIST },
                }).catch((err) => {
                    console.error("[admission-service] push failed:", err);
                }),
            ),
    );
}

/**
 * Returns a summary suitable for exposing to the mobile client as part of
 * `GET /api/user/me` — only the things the user needs to know about their own
 * waitlist state.
 */
export async function getWaitlistViewFor(userId: string) {
    const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        columns: {
            waitlistStatus: true,
            waitlistPosition: true,
            gender: true,
        },
    });

    if (!profile || profile.waitlistStatus !== "waitlisted") {
        return null;
    }

    // Count how many people of the same gender are ahead of them so the
    // position number they see is always relative to their bucket.
    const [{ ahead }] = await db
        .select({ ahead: count() })
        .from(profiles)
        .where(
            and(
                eq(profiles.waitlistStatus, "waitlisted"),
                eq(profiles.gender, profile.gender ?? ""),
                // Earlier positions are "ahead of" this user.
                sql`${profiles.waitlistPosition} < ${profile.waitlistPosition ?? 0}`,
            ),
        );

    const position = profile.waitlistPosition ?? (ahead + 1);
    return {
        status: "waitlisted" as const,
        position,
        peopleAhead: ahead,
        tier: positionTier(position),
    };
}

/**
 * Kindness layer: never show a scary raw "#248" to users on the waitlist.
 * Bucket their position into a friendly tier.
 */
export function positionTier(position: number) {
    if (position <= 10) return "imminent" as const;
    if (position <= 50) return "soon" as const;
    if (position <= 200) return "first_wave" as const;
    return "early_access" as const;
}

// Parse helpers re-exported for convenience at call sites that already import
// from this module.
export { parseSignupCapConfig };

/**
 * Marker for gender buckets in case callers need to enumerate.
 */
export const GENDER_BUCKETS: readonly GenderBucket[] = ["male", "female", "other"] as const;

// Small convenience used by the admin UI to know if anyone could still be
// admitted without raising the cap — useful for disabling "Release N" buttons.
export function hasHeadroom(stats: AdmissionStats, bucket: GenderBucket) {
    const max = bucket === "male" ? stats.caps.maxMale : bucket === "female" ? stats.caps.maxFemale : stats.caps.maxOther;
    return stats.admitted[bucket] < max;
}

// (isNull import kept for downstream consumers that may want it.)
export { isNull };
