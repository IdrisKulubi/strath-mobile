import { and, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";

import db from "@/db/drizzle";
import { mutualMatches } from "@/db/schema";
import { getMeetupSlotConfig } from "@/lib/services/meetup-slot-service";
import {
    sendMeetupConfirmReminderPush,
    viewerStillNeedsConfirm,
} from "@/lib/services/meetup-push-notifications-service";

const REMINDER_WINDOW_MS = 6 * 60 * 60 * 1000;

export interface MeetupConfirmReminderResult {
    scanned: number;
    sent: number;
    skipped: number;
}

/**
 * Sends one reminder push per mutual match when within ~6h of slotConfirmBy.
 */
export async function runMeetupConfirmReminders(
    now: Date = new Date(),
): Promise<MeetupConfirmReminderResult> {
    getMeetupSlotConfig();

    const rows = await db.query.mutualMatches.findMany({
        where: and(
            inArray(mutualMatches.status, ["mutual", "being_arranged"]),
            isNotNull(mutualMatches.scheduledAt),
            isNotNull(mutualMatches.slotConfirmBy),
            gt(mutualMatches.slotConfirmBy, now),
            isNull(mutualMatches.slotConfirmReminderSentAt),
            or(
                isNull(mutualMatches.userASlotConfirmedAt),
                isNull(mutualMatches.userBSlotConfirmedAt),
            ),
        ),
    });

    let sent = 0;
    let skipped = 0;

    for (const row of rows) {
        if (!row.slotConfirmBy) {
            skipped += 1;
            continue;
        }

        const msUntilDeadline = row.slotConfirmBy.getTime() - now.getTime();
        if (msUntilDeadline > REMINDER_WINDOW_MS || msUntilDeadline <= 0) {
            skipped += 1;
            continue;
        }

        const reminders: Promise<void>[] = [];

        if (viewerStillNeedsConfirm(row, row.userAId)) {
            reminders.push(
                sendMeetupConfirmReminderPush({
                    userId: row.userAId,
                    partnerUserId: row.userBId,
                    confirmBy: row.slotConfirmBy,
                }),
            );
        }
        if (viewerStillNeedsConfirm(row, row.userBId)) {
            reminders.push(
                sendMeetupConfirmReminderPush({
                    userId: row.userBId,
                    partnerUserId: row.userAId,
                    confirmBy: row.slotConfirmBy,
                }),
            );
        }

        if (reminders.length === 0) {
            skipped += 1;
            continue;
        }

        await Promise.all(reminders);
        await db
            .update(mutualMatches)
            .set({ slotConfirmReminderSentAt: now, updatedAt: now })
            .where(eq(mutualMatches.id, row.id));

        sent += reminders.length;
    }

    return { scanned: rows.length, sent, skipped };
}
