import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { NotificationsService } from '@/lib/services/notifications-service';
import { useToast } from '@/components/ui/toast';

export type AppNotificationType = 'match' | 'message' | 'call' | 'generic';

type NotificationData = {
    type?: AppNotificationType;
    matchId?: string;
    route?: string;
};

const ANDROID_CHANNEL_ID = 'default';

function getProjectId(): string | undefined {
    return (
        (Constants.expoConfig as any)?.extra?.eas?.projectId ||
        (Constants as any)?.easConfig?.projectId
    );
}

function pickToastVariant(type?: AppNotificationType) {
    switch (type) {
        case 'match':
            return 'accent' as const;
        case 'call':
            return 'warning' as const;
        case 'message':
            return 'default' as const;
        default:
            return 'default' as const;
    }
}

async function configureAndroidChannel() {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
        console.log('[Notifications] Must use physical device for push notifications');
        return null;
    }

    const existingStatus = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus.status;

    if (finalStatus !== 'granted') {
        const requestStatus = await Notifications.requestPermissionsAsync();
        finalStatus = requestStatus.status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return null;
    }

    const projectId = getProjectId();
    if (!projectId) {
        console.warn('[Notifications] Missing EAS projectId; cannot fetch Expo push token');
        return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResponse.data;
}

export function usePushNotifications() {
    const toast = useToast();
    const router = useRouter();
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

    const notificationReceivedListener = useRef<Notifications.EventSubscription | null>(null);
    const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        // Foreground behavior: show alert + sound + badge (system may still suppress banner on iOS)
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });

        configureAndroidChannel().catch((e) =>
            console.warn('[Notifications] Failed configuring Android channel', e)
        );

        registerForPushNotificationsAsync()
            .then(async (token) => {
                if (!token) return;
                setExpoPushToken(token);

                try {
                    await NotificationsService.registerPushToken(token);
                    console.log('[Notifications] Push token registered');
                } catch (e) {
                    console.warn('[Notifications] Failed to register token with backend', e);
                }
            })
            .catch((e) => console.warn('[Notifications] Token registration error', e));

        notificationReceivedListener.current =
            Notifications.addNotificationReceivedListener((notification) => {
                const content = notification.request.content;
                const data = (content.data || {}) as NotificationData;
                const message = content.body || content.title || 'New notification';

                // Nice in-app notification for foreground
                toast.show({
                    message,
                    variant: pickToastVariant(data.type),
                    position: 'top',
                    duration: 3500,
                    showInModal: true,
                });
            });

        notificationResponseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
                const content = response.notification.request.content;
                const data = (content.data || {}) as NotificationData;

                if (typeof data.route === 'string' && data.route.length > 0) {
                    router.push(data.route as any);
                    return;
                }

                if (data.matchId && (data.type === 'message' || data.type === 'call')) {
                    router.push(`/chat/${data.matchId}` as any);
                    return;
                }
            });

        return () => {
            notificationReceivedListener.current?.remove();
            notificationResponseListener.current?.remove();
        };
        // We intentionally do NOT include `toast`/`router` in deps; these are stable in practice
        // and re-registering listeners can lead to duplicates.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { expoPushToken };
}
