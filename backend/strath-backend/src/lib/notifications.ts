import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

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
    data?: any
): Promise<unknown>;
export async function sendPushNotification(
    pushToken: string,
    payload: PushNotificationPayload
): Promise<unknown>;
export async function sendPushNotification(
    pushToken: string,
    messageOrPayload: string | PushNotificationPayload,
    data?: any
) {
    if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
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

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error("Error sending push notification chunk", error);
        }
    }

    // In a real app, you'd want to handle receipt errors here (e.g. invalid tokens)
    return tickets;
}
