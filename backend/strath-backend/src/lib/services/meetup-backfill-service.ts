import { eq } from "drizzle-orm";
import db from "@/db/drizzle";
import { dateMatches, mutualMatches } from "@/db/schema";
import { assignLegacyArrangingSlot } from "@/lib/services/meetup-slot-service";

export interface BackfillArrangingResult {
    updated: number;
    skipped: number;
    dateMatchesCreated: number;
    details: { mutualMatchId: string; scheduledAt: string }[];
}

/**
 * Assign this week's Wednesday slot to all being_arranged mutual matches and enroll
 * them in the slot-confirmation flow. Idempotent: re-run refreshes slot + clears confirmations.
 */
export async function backfillArrangingMeetupSlots(
    backfillAt: Date = new Date(),
): Promise<BackfillArrangingResult> {
    const assignment = assignLegacyArrangingSlot(backfillAt);
    const rows = await db.query.mutualMatches.findMany({
        where: eq(mutualMatches.status, "being_arranged"),
    });

    let updated = 0;
    let skipped = 0;
    let dateMatchesCreated = 0;
    const details: BackfillArrangingResult["details"] = [];

    for (const row of rows) {
        let dateMatchId = row.legacyDateMatchId;

        if (!dateMatchId) {
            const [created] = await db
                .insert(dateMatches)
                .values({
                    candidatePairId: row.candidatePairId,
                    userAId: row.userAId,
                    userBId: row.userBId,
                    vibe: "coffee",
                    status: "pending_setup",
                    scheduledAt: assignment.scheduledAt,
                    callCompleted: false,
                    userAConfirmed: false,
                    userBConfirmed: false,
                    createdAt: backfillAt,
                })
                .returning({ id: dateMatches.id });
            dateMatchId = created.id;
            dateMatchesCreated += 1;
        } else {
            await db
                .update(dateMatches)
                .set({
                    scheduledAt: assignment.scheduledAt,
                    status: "pending_setup",
                })
                .where(eq(dateMatches.id, dateMatchId));
        }

        await db
            .update(mutualMatches)
            .set({
                scheduledAt: assignment.scheduledAt,
                slotConfirmBy: assignment.confirmBy,
                assignedSlot: assignment.slot,
                legacyDateMatchId: dateMatchId,
                userASlotConfirmedAt: null,
                userBSlotConfirmedAt: null,
                slotConfirmReminderSentAt: null,
                updatedAt: backfillAt,
            })
            .where(eq(mutualMatches.id, row.id));

        const { sendMeetupSlotAssignedPushes } = await import(
            "@/lib/services/meetup-push-notifications-service"
        );
        await sendMeetupSlotAssignedPushes({
            userAId: row.userAId,
            userBId: row.userBId,
            scheduledAt: assignment.scheduledAt,
            confirmBy: assignment.confirmBy,
        }).catch((err) => {
            console.warn("[meetup-backfill] slot push failed", row.id, err);
        });

        updated += 1;
        details.push({
            mutualMatchId: row.id,
            scheduledAt: assignment.scheduledAt.toISOString(),
        });
    }

    if (rows.length === 0) {
        skipped = 0;
    }

    console.log("[meetup-backfill] arranging slots assigned", {
        updated,
        dateMatchesCreated,
        scheduledAt: assignment.scheduledAt.toISOString(),
        confirmBy: assignment.confirmBy.toISOString(),
    });

    return { updated, skipped, dateMatchesCreated, details };
}
