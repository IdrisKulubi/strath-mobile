import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

export async function sendPushNotification(
    pushToken: string,
    message: string,
    data?: any
) {
    if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        return;
    }

    const messages: ExpoPushMessage[] = [];
    messages.push({
        to: pushToken,
        sound: "default",
        body: message,
        data: data,
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
