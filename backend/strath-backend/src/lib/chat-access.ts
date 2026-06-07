import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { mutualMatches } from "@/db/schema";
import { errorResponse } from "@/lib/api-response";
import {
    buildSlotConfirmationView,
    type SlotConfirmationView,
} from "@/lib/services/meetup-confirmation-service";

/** Statuses where the mobile Messages tab lists the thread and chat APIs allow access. */
export const CHAT_UNLOCKED_STATUSES = [
    "mutual",
    "being_arranged",
    "upcoming",
    "completed",
] as const;

export type ChatUnlockedStatus = (typeof CHAT_UNLOCKED_STATUSES)[number];

export function isChatUnlockedStatus(status: string): status is ChatUnlockedStatus {
    return (CHAT_UNLOCKED_STATUSES as readonly string[]).includes(status);
}

/**
 * Slot confirmation blocks chat for new `mutual` matches only.
 * Legacy pairs in `being_arranged` may message while confirm UI remains on Dates.
 */
export function shouldBlockChatForSlotConfirmation(
    status: string,
    slot: Pick<SlotConfirmationView, "needsSlotConfirmation" | "viewerSlotConfirmed">,
): boolean {
    if (status === "being_arranged") {
        return false;
    }
    return slot.needsSlotConfirmation && !slot.viewerSlotConfirmed;
}

/**
 * Read access: listable mutual match exists. Slot confirmation does not block history.
 * Returns `null` when allowed, or an error Response when blocked.
 */
export async function assertChatReadable(matchId: string, userId: string) {
    const mm = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.legacyMatchId, matchId),
    });

    if (!mm || !isChatUnlockedStatus(mm.status)) {
        return errorResponse(
            new Error("Messaging is available once you have a mutual match."),
            403,
        );
    }

    return null;
}

/**
 * Send access: same as read, plus slot confirmation when required.
 * Returns `null` when access is allowed, or an error Response when blocked.
 */
export async function assertChatUnlocked(matchId: string, userId: string) {
    const readGate = await assertChatReadable(matchId, userId);
    if (readGate) return readGate;

    const mm = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.legacyMatchId, matchId),
    });
    if (!mm) {
        return errorResponse(
            new Error("Messaging is available once you have a mutual match."),
            403,
        );
    }

    const slot = buildSlotConfirmationView(mm, userId);
    if (shouldBlockChatForSlotConfirmation(mm.status, slot)) {
        return errorResponse(
            new Error("Confirm your assigned date before messaging."),
            403,
        );
    }

    return null;
}
