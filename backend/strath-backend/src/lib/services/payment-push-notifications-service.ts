import { and, eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { dateMatches, datePayments, profiles, user } from "@/db/schema";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

const DATES_ROUTE = "/(tabs)/dates";

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

function paymentPushData(dateMatchId: string, type: string) {
    return {
        type,
        route: DATES_ROUTE,
        dateId: dateMatchId,
    };
}

export async function viewerNeedsPayment(
    dateMatchId: string,
    userId: string,
): Promise<boolean> {
    const payment = await db.query.datePayments.findFirst({
        where: and(
            eq(datePayments.dateMatchId, dateMatchId),
            eq(datePayments.userId, userId),
        ),
    });
    if (!payment) return true;
    return payment.status !== "paid" && payment.status !== "credited";
}

export async function sendPaymentRequiredPushes(input: {
    userAId: string;
    userBId: string;
    dateMatchId: string;
}): Promise<void> {
    const [userA, userB] = await Promise.all([
        getUserPushAndName(input.userAId),
        getUserPushAndName(input.userBId),
    ]);

    const body =
        "You both said yes 🎉  Confirm your date with a KES 499 setup fee.";
    const data = paymentPushData(input.dateMatchId, NOTIFICATION_TYPES.PAYMENT_REQUIRED);
    const sends: Promise<unknown>[] = [];

    if (userA.pushToken) {
        sends.push(
            sendPushNotification(userA.pushToken, {
                title: "Confirm your date",
                body,
                data,
            }),
        );
    }
    if (userB.pushToken) {
        sends.push(
            sendPushNotification(userB.pushToken, {
                title: "Confirm your date",
                body,
                data,
            }),
        );
    }

    await Promise.all(sends);
}

export async function sendPaymentPartnerPaidPush(input: {
    dateMatchId: string;
    payingUserId: string;
}): Promise<void> {
    const match = await db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, input.dateMatchId),
    });
    if (!match) return;

    const recipientId =
        match.userAId === input.payingUserId ? match.userBId : match.userAId;

    const [recipient, partner] = await Promise.all([
        getUserPushAndName(recipientId),
        getUserPushAndName(input.payingUserId),
    ]);

    if (!recipient.pushToken) return;

    await sendPushNotification(recipient.pushToken, {
        title: `${partner.firstName} confirmed — your turn`,
        body: "They've confirmed. Your turn — pay KES 499 to lock it in.",
        data: paymentPushData(input.dateMatchId, NOTIFICATION_TYPES.PAYMENT_PARTNER_PAID),
    });
}

export async function sendPaymentBothPaidPushes(input: {
    dateMatchId: string;
}): Promise<void> {
    const match = await db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, input.dateMatchId),
    });
    if (!match) return;

    const [userA, userB] = await Promise.all([
        getUserPushAndName(match.userAId),
        getUserPushAndName(match.userBId),
    ]);

    const body = "You're both confirmed. We're arranging this one for you.";
    const data = paymentPushData(input.dateMatchId, NOTIFICATION_TYPES.PAYMENT_BOTH_PAID);
    const sends: Promise<unknown>[] = [];

    if (userA.pushToken) {
        sends.push(
            sendPushNotification(userA.pushToken, {
                title: "Date confirmed",
                body,
                data,
            }),
        );
    }
    if (userB.pushToken) {
        sends.push(
            sendPushNotification(userB.pushToken, {
                title: "Date confirmed",
                body,
                data,
            }),
        );
    }

    await Promise.all(sends);
}

export async function sendPaymentExpiringPush(input: {
    userId: string;
    dateMatchId: string;
}): Promise<void> {
    const recipient = await getUserPushAndName(input.userId);
    if (!recipient.pushToken) return;

    await sendPushNotification(recipient.pushToken, {
        title: "Confirmation expires soon",
        body: "Your date confirmation expires soon. Confirm to keep it.",
        data: paymentPushData(input.dateMatchId, NOTIFICATION_TYPES.PAYMENT_EXPIRING),
    });
}

export async function sendPaymentExpiredPushes(input: {
    dateMatchId: string;
    userAId: string;
    userBId: string;
}): Promise<void> {
    const [userA, userB] = await Promise.all([
        getUserPushAndName(input.userAId),
        getUserPushAndName(input.userBId),
    ]);

    const body =
        "This match expired because confirmation wasn't completed in time.";
    const data = paymentPushData(input.dateMatchId, NOTIFICATION_TYPES.PAYMENT_EXPIRED);
    const sends: Promise<unknown>[] = [];

    if (userA.pushToken) {
        sends.push(
            sendPushNotification(userA.pushToken, {
                title: "Match expired",
                body,
                data,
            }),
        );
    }
    if (userB.pushToken) {
        sends.push(
            sendPushNotification(userB.pushToken, {
                title: "Match expired",
                body,
                data,
            }),
        );
    }

    await Promise.all(sends);
}

export async function sendCreditGrantedPush(input: {
    userId: string;
    dateMatchId: string;
}): Promise<void> {
    const recipient = await getUserPushAndName(input.userId);
    if (!recipient.pushToken) return;

    await sendPushNotification(recipient.pushToken, {
        title: "Credit added",
        body: "You've got KES 499 StrathSpace credit toward your next date.",
        data: paymentPushData(input.dateMatchId, NOTIFICATION_TYPES.CREDIT_GRANTED),
    });
}

export async function sendRefundCompletedPush(input: {
    userId: string;
    dateMatchId: string;
}): Promise<void> {
    const recipient = await getUserPushAndName(input.userId);
    if (!recipient.pushToken) return;

    await sendPushNotification(recipient.pushToken, {
        title: "Refund processed",
        body: "Your KES 499 refund has been processed.",
        data: paymentPushData(input.dateMatchId, NOTIFICATION_TYPES.REFUND_COMPLETED),
    });
}

export async function notifyPaymentMatchExpired(input: {
    dateMatchId: string;
    userAId: string;
    userBId: string;
    credited: boolean;
    payerUserId: string | null;
}): Promise<void> {
    await sendPaymentExpiredPushes({
        dateMatchId: input.dateMatchId,
        userAId: input.userAId,
        userBId: input.userBId,
    });

    if (input.credited && input.payerUserId) {
        await sendCreditGrantedPush({
            userId: input.payerUserId,
            dateMatchId: input.dateMatchId,
        });
    }
}

function formatKesFromCents(cents: number): string {
    return `KES ${(cents / 100).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export async function notifyDateCancelledCredit(input: {
    dateMatchId: string;
    creditedUserIds: string[];
    amountByUser: Record<string, number>;
}): Promise<void> {
    const sends = input.creditedUserIds.map(async (userId) => {
        const recipient = await getUserPushAndName(userId);
        if (!recipient.pushToken) return;

        const amountCents = input.amountByUser[userId] ?? 49900;
        const amountLabel = formatKesFromCents(amountCents);

        await sendPushNotification(recipient.pushToken, {
            title: "Date cancelled",
            body: `${amountLabel} saved as StrathSpace credit for your next date.`,
            data: paymentPushData(input.dateMatchId, NOTIFICATION_TYPES.CREDIT_GRANTED),
        });
    });

    await Promise.all(sends);
}
