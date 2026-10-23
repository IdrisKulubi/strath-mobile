import { and, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";

import db from "@/db/drizzle";
import { dateMatches, mutualMatches } from "@/db/schema";
import { getPaymentsEnabled } from "@/lib/payments/payment-flags";
import { getMeetupSlotConfig } from "@/lib/services/meetup-slot-service";
import {
    sendMeetupConfirmReminderPush,
    viewerStillNeedsConfirm,
} from "@/lib/services/meetup-push-notifications-service";
import {
    sendPaymentExpiringPush,
    viewerNeedsPayment,
} from "@/lib/services/payment-push-notifications-service";

const REMINDER_WINDOW_MS = 6 * 60 * 60 * 1000;

const PAYMENT_REMINDER_STATES = ["awaiting_payment", "paid_waiting_for_other"] as const;

export interface MeetupConfirmReminderResult {
    scanned: number;
    sent: number;
    skipped: number;
}

/**
 * Sends one reminder push per mutual match when within ~6h of slotConfirmBy
 * (or paymentDueBy when payments are enabled).
 */
export async function runMeetupConfirmReminders(
    now: Date = new Date(),
): Promise<MeetupConfirmReminderResult> {
    getMeetupSlotConfig();

    const paymentsEnabled = await getPaymentsEnabled();

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

        const dateMatch = row.legacyDateMatchId
            ? await db.query.dateMatches.findFirst({
                  where: eq(dateMatches.id, row.legacyDateMatchId),
              })
            : null;

        const usePaymentReminder =
            paymentsEnabled
            && dateMatch
            && PAYMENT_REMINDER_STATES.includes(
                dateMatch.paymentState as (typeof PAYMENT_REMINDER_STATES)[number],
            );

        const reminders: Promise<void>[] = [];

        if (usePaymentReminder && dateMatch) {
            if (await viewerNeedsPayment(dateMatch.id, row.userAId)) {
                reminders.push(
                    sendPaymentExpiringPush({
                        userId: row.userAId,
                        dateMatchId: dateMatch.id,
                    }),
                );
            }
            if (await viewerNeedsPayment(dateMatch.id, row.userBId)) {
                reminders.push(
                    sendPaymentExpiringPush({
                        userId: row.userBId,
                        dateMatchId: dateMatch.id,
                    }),
                );
            }
        } else {
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
