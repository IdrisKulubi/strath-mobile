import { eq } from "drizzle-orm";

import { user } from "@/db/schema";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { upsertProfileActivitySignalLight } from "@/lib/services/profile-intelligence-service";

const PRESENCE_KEY_PREFIX = "presence:";
const PRESENCE_TTL_SECONDS = 120;
const LAST_ACTIVE_PERSIST_PREFIX = "last_active_persisted:";
const LAST_ACTIVE_PERSIST_INTERVAL_MS = 10 * 60 * 1000;

function presenceKey(userId: string) {
    return `${PRESENCE_KEY_PREFIX}${userId}`;
}

function lastActivePersistKey(userId: string) {
    return `${LAST_ACTIVE_PERSIST_PREFIX}${userId}`;
}

export async function recordUserPresence(input: {
    userId: string;
    isOnline: boolean;
    now?: Date;
}) {
    const now = input.now ?? new Date();

    try {
        if (input.isOnline) {
            await redis.set(presenceKey(input.userId), "online", { ex: PRESENCE_TTL_SECONDS });
        } else {
            await redis.del(presenceKey(input.userId));
        }
    } catch (error) {
        console.warn("[presence] redis update failed", error);
    }

    let persistedLastActive = false;

    if (!input.isOnline) {
        await db.update(user)
            .set({
                isOnline: false,
                lastActive: now,
                updatedAt: now,
            })
            .where(eq(user.id, input.userId));
        persistedLastActive = true;

        try {
            await redis.del(lastActivePersistKey(input.userId));
        } catch {
            // non-fatal
        }

        upsertProfileActivitySignalLight(input.userId, now).catch((error) => {
            console.warn("[presence] offline activity signal update failed", error);
        });
    } else {
        let shouldPersist = true;

        try {
            const lastPersisted = await redis.get<number>(lastActivePersistKey(input.userId));
            if (typeof lastPersisted === "number" && now.getTime() - lastPersisted < LAST_ACTIVE_PERSIST_INTERVAL_MS) {
                shouldPersist = false;
            }
        } catch {
            // If Redis is unavailable, fall back to persisting.
        }

        if (shouldPersist) {
            await db.update(user)
                .set({
                    isOnline: true,
                    lastActive: now,
                    updatedAt: now,
                })
                .where(eq(user.id, input.userId));

            persistedLastActive = true;

            try {
                await redis.set(lastActivePersistKey(input.userId), now.getTime(), {
                    ex: Math.ceil(LAST_ACTIVE_PERSIST_INTERVAL_MS / 1000) + 60,
                });
            } catch {
                // non-fatal
            }

            upsertProfileActivitySignalLight(input.userId, now).catch((error) => {
                console.warn("[presence] activity signal update failed", error);
            });
        } else {
            await db.update(user)
                .set({
                    isOnline: true,
                    updatedAt: now,
                })
                .where(eq(user.id, input.userId));
        }
    }

    return {
        isOnline: input.isOnline,
        lastActive: now.toISOString(),
        persistedLastActive,
    };
}
