import { Expo, ExpoPushMessage } from "expo-server-sdk";

import { enqueuePush } from "./push-delivery";

export type PushNotificationPayload = {
    title?: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: "default" | string;
    channelId?: string;
    badge?: number;
};

export async function sendPushNotification(
    pushToken: string,
    message: string,
    data?: Record<string, unknown>
): Promise<unknown>;
export async function sendPushNotification(
    pushToken: string,
    payload: PushNotificationPayload
): Promise<unknown>;
export async function sendPushNotification(
    pushToken: string,
    messageOrPayload: string | PushNotificationPayload,
    data?: Record<string, unknown>
) {
    if (!Expo.isExpoPushToken(pushToken)) {
        console.error("Invalid Expo push token; notification skipped");
        return;
    }

    const payload: PushNotificationPayload =
        typeof messageOrPayload === "string"
            ? { body: messageOrPayload, data }
            : messageOrPayload;

    const sound = payload.sound ?? "default";
    const channelId = payload.channelId ?? "default";

    const messages: ExpoPushMessage[] = [];
    messages.push({
        to: pushToken,
        sound,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        channelId,
        badge: payload.badge,
        priority: "high",
    });

    return enqueuePush(messages[0]);
}
