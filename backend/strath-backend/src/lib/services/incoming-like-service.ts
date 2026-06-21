import { and, eq, or } from "drizzle-orm";

import db from "@/db/drizzle";
import { matches, profiles, swipes, user } from "@/db/schema";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

export type IncomingLikeSkipReason = "matched" | "already_responded" | "duplicate_like" | "self";

export type IncomingLikeResult = {
    recorded: boolean;
    notified: boolean;
    skippedReason?: IncomingLikeSkipReason;
};

export function buildIncomingLikeNotification(firstName: string) {
    const name = firstName.trim() || "Someone";
    return {
        title: "Someone chose you",
        body: `${name} chose you on StrathSpace`,
        data: {
            type: NOTIFICATION_TYPES.DATE_REQUEST_RECEIVED,
            route: "/(tabs)?homeTab=interested",
        },
    };
}

export function resolveIncomingLikeAction(input: {
    hasMatch: boolean;
    targetAlreadySwipedOnSwiper: boolean;
    existingSwipeIsLike: boolean;
    hasExistingSwipe: boolean;
}): { shouldRecord: boolean; shouldNotify: boolean; skippedReason?: IncomingLikeSkipReason } {
    if (input.hasMatch) {
        return { shouldRecord: false, shouldNotify: false, skippedReason: "matched" };
    }
    if (input.targetAlreadySwipedOnSwiper) {
        return { shouldRecord: false, shouldNotify: false, skippedReason: "already_responded" };
    }
    if (input.hasExistingSwipe && input.existingSwipeIsLike) {
        return { shouldRecord: true, shouldNotify: false, skippedReason: "duplicate_like" };
    }
    return { shouldRecord: true, shouldNotify: true };
}

async function getSwiperFirstName(swiperId: string): Promise<string> {
    const [profile, swiperUser] = await Promise.all([
        db.query.profiles.findFirst({
            where: eq(profiles.userId, swiperId),
            columns: { firstName: true },
        }),
        db.query.user.findFirst({
            where: eq(user.id, swiperId),
            columns: { name: true },
        }),
    ]);

    return profile?.firstName?.trim()
        || swiperUser?.name?.split(" ")[0]?.trim()
        || "Someone";
}

/**
 * Records a one-sided incoming like (swipes row) and notifies the recipient.
 * Skips when users are already matched or the recipient already swiped on the sender.
 */
export async function recordIncomingLike(input: {
    swiperId: string;
    swipedId: string;
}): Promise<IncomingLikeResult> {
    const { swiperId, swipedId } = input;

    if (swiperId === swipedId) {
        return { recorded: false, notified: false, skippedReason: "self" };
    }

    const existingMatch = await db.query.matches.findFirst({
        where: or(
            and(eq(matches.user1Id, swiperId), eq(matches.user2Id, swipedId)),
            and(eq(matches.user1Id, swipedId), eq(matches.user2Id, swiperId)),
        ),
        columns: { id: true },
    });

    const targetResponse = await db.query.swipes.findFirst({
        where: and(eq(swipes.swiperId, swipedId), eq(swipes.swipedId, swiperId)),
        columns: { id: true, isLike: true },
    });

    const existingSwipe = await db.query.swipes.findFirst({
        where: and(eq(swipes.swiperId, swiperId), eq(swipes.swipedId, swipedId)),
        columns: { id: true, isLike: true },
    });

    const action = resolveIncomingLikeAction({
        hasMatch: Boolean(existingMatch),
        targetAlreadySwipedOnSwiper: Boolean(targetResponse),
        existingSwipeIsLike: Boolean(existingSwipe?.isLike),
        hasExistingSwipe: Boolean(existingSwipe),
    });

    if (!action.shouldRecord) {
        return {
            recorded: false,
            notified: false,
            skippedReason: action.skippedReason,
        };
    }

    if (existingSwipe) {
        await db
            .update(swipes)
            .set({ isLike: true, createdAt: new Date() })
            .where(eq(swipes.id, existingSwipe.id));
    } else {
        await db.insert(swipes).values({
            swiperId,
            swipedId,
            isLike: true,
        });
    }

    if (!action.shouldNotify) {
        return {
            recorded: true,
            notified: false,
            skippedReason: action.skippedReason,
        };
    }

    const recipient = await db.query.user.findFirst({
        where: eq(user.id, swipedId),
        columns: { pushToken: true },
    });

    if (!recipient?.pushToken) {
        return { recorded: true, notified: false };
    }

    const firstName = await getSwiperFirstName(swiperId);
    const notification = buildIncomingLikeNotification(firstName);

    await sendPushNotification(recipient.pushToken, {
        ...notification,
        data: {
            ...notification.data,
            userId: swiperId,
        },
    });

    return { recorded: true, notified: true };
}
