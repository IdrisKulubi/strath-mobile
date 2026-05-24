import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { mutualMatches, profiles, user } from "@/db/schema";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import {
    bothUsersConfirmedSlot,
    formatMeetupSlotForDisplay,
    isSlotConfirmEligibleStatus,
} from "@/lib/services/meetup-slot-service";

async function getUserPushAndName(userId: string) {
    const [account, profile] = await Promise.all([
        db.query.user.findFirst({ where: eq(user.id, userId) }),
        db.query.profiles.findFirst({ where: eq(profiles.userId, userId) }),
    ]);
    return {
        pushToken: account?.pushToken ?? null,
        firstName: profile?.firstName ?? account?.name?.split(" ")[0] ?? "your match",
    };
}

export async function sendMeetupSlotAssignedPushes(input: {
    userAId: string;
    userBId: string;
    scheduledAt: Date;
    confirmBy: Date;
}): Promise<void> {
    const [userA, userB] = await Promise.all([
        getUserPushAndName(input.userAId),
        getUserPushAndName(input.userBId),
    ]);
    const dateStr = formatMeetupSlotForDisplay(input.scheduledAt);
    const confirmStr = formatMeetupSlotForDisplay(input.confirmBy);

    const sends: Promise<unknown>[] = [];

    if (userA.pushToken) {
        sends.push(
            sendPushNotification(userA.pushToken, {
                title: `Confirm your date with ${userB.firstName}`,
                body: `${dateStr}. Confirm by ${confirmStr}.`,
                data: {
                    type: NOTIFICATION_TYPES.MEETUP_SLOT_ASSIGNED,
                    route: "/(tabs)",
                },
            }),
        );
    }
    if (userB.pushToken) {
        sends.push(
            sendPushNotification(userB.pushToken, {
                title: `Confirm your date with ${userA.firstName}`,
                body: `${dateStr}. Confirm by ${confirmStr}.`,
                data: {
                    type: NOTIFICATION_TYPES.MEETUP_SLOT_ASSIGNED,
                    route: "/(tabs)",
                },
            }),
        );
    }

    await Promise.all(sends);
}

export async function sendMeetupPartnerConfirmedPush(input: {
    recipientUserId: string;
    partnerUserId: string;
}): Promise<void> {
    const [recipient, partner] = await Promise.all([
        getUserPushAndName(input.recipientUserId),
        getUserPushAndName(input.partnerUserId),
    ]);

    if (!recipient.pushToken) return;

    await sendPushNotification(recipient.pushToken, {
        title: `${partner.firstName} confirmed — your turn`,
        body: "Open StrathSpace to lock in your campus date.",
        data: {
            type: NOTIFICATION_TYPES.MEETUP_PARTNER_CONFIRMED,
            route: "/(tabs)/dates",
        },
    });
}

export async function notifyPartnerAfterSlotConfirm(
    mutualMatchId: string,
    confirmingUserId: string,
): Promise<void> {
    const row = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.id, mutualMatchId),
    });
    if (!row || !isSlotConfirmEligibleStatus(row.status)) return;

    const partnerId =
        row.userAId === confirmingUserId ? row.userBId : row.userAId;
    const partnerConfirmed = row.userAId === confirmingUserId
        ? Boolean(row.userBSlotConfirmedAt)
        : Boolean(row.userASlotConfirmedAt);

    if (partnerConfirmed) return;

    await sendMeetupPartnerConfirmedPush({
        recipientUserId: partnerId,
        partnerUserId: confirmingUserId,
    });
}

export async function sendMeetupConfirmReminderPush(input: {
    userId: string;
    partnerUserId: string;
    confirmBy: Date;
}): Promise<void> {
    const [recipient, partner] = await Promise.all([
        getUserPushAndName(input.userId),
        getUserPushAndName(input.partnerUserId),
    ]);

    if (!recipient.pushToken) return;

    const confirmStr = formatMeetupSlotForDisplay(input.confirmBy);
    await sendPushNotification(recipient.pushToken, {
        title: `Confirm by ${confirmStr}`,
        body: `${partner.firstName} is waiting — lock in your campus date.`,
        data: {
            type: NOTIFICATION_TYPES.MEETUP_CONFIRM_REMINDER,
            route: "/(tabs)",
        },
    });
}

export function viewerStillNeedsConfirm(
    row: typeof mutualMatches.$inferSelect,
    userId: string,
): boolean {
    if (!isSlotConfirmEligibleStatus(row.status)) return false;
    if (!row.scheduledAt || !row.slotConfirmBy) return false;
    if (
        bothUsersConfirmedSlot({
            userASlotConfirmedAt: row.userASlotConfirmedAt,
            userBSlotConfirmedAt: row.userBSlotConfirmedAt,
        })
    ) {
        return false;
    }
    const isUserA = row.userAId === userId;
    return !(isUserA ? row.userASlotConfirmedAt : row.userBSlotConfirmedAt);
}
