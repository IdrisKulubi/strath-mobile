import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { profiles, user } from "@/db/schema";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { formatMeetupSlotForDisplay } from "@/lib/services/meetup-slot-service";

const RESCHEDULE_ROUTE = "/(tabs)/dates";

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

function reschedulePushData(input: { mutualMatchId: string; requestId: string }) {
    return {
        type: NOTIFICATION_TYPES.MEETUP_RESCHEDULE_REQUESTED,
        mutualMatchId: input.mutualMatchId,
        requestId: input.requestId,
        route: RESCHEDULE_ROUTE,
    };
}

function firePush(task: Promise<unknown>, label: string) {
    void task.catch((error) => {
        console.error(`[meetup-reschedule-push] ${label}`, error);
    });
}

export async function sendRescheduleRequestedPush(input: {
    recipientUserId: string;
    requesterUserId: string;
    scheduledAt: Date;
    mutualMatchId: string;
    requestId: string;
}): Promise<void> {
    const [recipient, requester] = await Promise.all([
        getUserPushAndName(input.recipientUserId),
        getUserPushAndName(input.requesterUserId),
    ]);

    if (!recipient.pushToken) return;

    const slotLabel = formatMeetupSlotForDisplay(input.scheduledAt);
    firePush(
        sendPushNotification(recipient.pushToken, {
            title: "Date change request",
            body: `${requester.firstName} wants to move your StrathSpace date to ${slotLabel}.`,
            data: reschedulePushData({
                mutualMatchId: input.mutualMatchId,
                requestId: input.requestId,
            }),
        }),
        "requested",
    );
}

export async function sendRescheduleCounteredPush(input: {
    recipientUserId: string;
    counterUserId: string;
    scheduledAt: Date;
    mutualMatchId: string;
    requestId: string;
}): Promise<void> {
    const [recipient, counter] = await Promise.all([
        getUserPushAndName(input.recipientUserId),
        getUserPushAndName(input.counterUserId),
    ]);

    if (!recipient.pushToken) return;

    const slotLabel = formatMeetupSlotForDisplay(input.scheduledAt);
    firePush(
        sendPushNotification(recipient.pushToken, {
            title: "Counter-proposal",
            body: `${counter.firstName} suggested ${slotLabel}. Tap to respond.`,
            data: {
                type: NOTIFICATION_TYPES.MEETUP_RESCHEDULE_COUNTERED,
                mutualMatchId: input.mutualMatchId,
                requestId: input.requestId,
                route: RESCHEDULE_ROUTE,
            },
        }),
        "countered",
    );
}

/** Only when accept did not finalize (DATE_SCHEDULED is sent on finalize). */
export async function sendRescheduleAcceptedPush(input: {
    recipientUserId: string;
    accepterUserId: string;
    scheduledAt: Date;
    mutualMatchId: string;
}): Promise<void> {
    const [recipient, accepter] = await Promise.all([
        getUserPushAndName(input.recipientUserId),
        getUserPushAndName(input.accepterUserId),
    ]);

    if (!recipient.pushToken) return;

    const slotLabel = formatMeetupSlotForDisplay(input.scheduledAt);
    firePush(
        sendPushNotification(recipient.pushToken, {
            title: "Date updated",
            body: `You're set for ${slotLabel} with ${accepter.firstName}.`,
            data: {
                type: NOTIFICATION_TYPES.MEETUP_RESCHEDULE_ACCEPTED,
                mutualMatchId: input.mutualMatchId,
                route: RESCHEDULE_ROUTE,
            },
        }),
        "accepted",
    );
}

export async function sendRescheduleCancelledPush(input: {
    recipientUserId: string;
    requesterUserId: string;
    mutualMatchId: string;
}): Promise<void> {
    const [recipient, requester] = await Promise.all([
        getUserPushAndName(input.recipientUserId),
        getUserPushAndName(input.requesterUserId),
    ]);

    if (!recipient.pushToken) return;

    firePush(
        sendPushNotification(recipient.pushToken, {
            title: "Date change withdrawn",
            body: `${requester.firstName} withdrew their date change request.`,
            data: {
                type: NOTIFICATION_TYPES.MEETUP_RESCHEDULE_CANCELLED,
                mutualMatchId: input.mutualMatchId,
                route: RESCHEDULE_ROUTE,
            },
        }),
        "cancelled",
    );
}
