import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import {
    NotificationsService,
    NOTIFICATION_TYPES,
    type NotificationPayload,
    type AppNotificationType,
} from '@/lib/services/notifications-service';
import { useToast } from '@/components/ui/toast';

// Re-export for consumers that only need the type
export type { AppNotificationType };

const ANDROID_CHANNEL_ID = 'default';

function getProjectId(): string | undefined {
    return (
        (Constants.expoConfig as any)?.extra?.eas?.projectId ||
        (Constants as any)?.easConfig?.projectId
    );
}

// ─── Toast variant per notification type ─────────────────────────────────────

type ToastVariant = 'default' | 'accent' | 'warning' | 'danger';

function toastVariantFor(type?: AppNotificationType): ToastVariant {
    switch (type) {
        case NOTIFICATION_TYPES.MUTUAL_MATCH:
        case NOTIFICATION_TYPES.DATE_REQUEST_ACCEPTED:
        case NOTIFICATION_TYPES.DATE_SCHEDULED:
        case NOTIFICATION_TYPES.MATCH:
            return 'accent';

        case NOTIFICATION_TYPES.CALL_REMINDER:
        case NOTIFICATION_TYPES.CALL:
            return 'warning';

        case NOTIFICATION_TYPES.DATE_REQUEST_DECLINED:
        case NOTIFICATION_TYPES.DATE_CANCELLED:
            return 'danger';

        default:
            return 'default';
    }
}

// ─── Deep-link resolver ───────────────────────────────────────────────────────
// Returns a router-compatible path string or null if no navigation needed.

function resolveRoute(data: NotificationPayload): string | null {
    // Explicit override always wins
    if (data.route) return data.route;

    switch (data.type) {
        // Both incoming invite and sent invite accepted → Dates tab (Incoming section)
        case NOTIFICATION_TYPES.DATE_REQUEST_RECEIVED:
        case NOTIFICATION_TYPES.DATE_REQUEST_ACCEPTED:
        case NOTIFICATION_TYPES.DATE_REQUEST_DECLINED:
        case NOTIFICATION_TYPES.MUTUAL_MATCH:
        case NOTIFICATION_TYPES.DATE_SCHEDULED:
        case NOTIFICATION_TYPES.DATE_CANCELLED:
            return '/(tabs)/dates';

        // 3-min call reminder → vibe-check screen
        case NOTIFICATION_TYPES.CALL_REMINDER:
        case NOTIFICATION_TYPES.CALL:
            if (data.matchId) return `/vibe-check/${data.matchId}`;
            return '/(tabs)/dates';

        // Post-date feedback prompt → feedback screen with dateId + name
        case NOTIFICATION_TYPES.FEEDBACK_PROMPT:
            if (data.dateId) {
                const name = data.name ? `?name=${encodeURIComponent(data.name)}` : '';
                return `/feedback/${data.dateId}${name}`;
            }
            return '/(tabs)/dates';

        // Legacy message / match
        case NOTIFICATION_TYPES.MESSAGE:
            if (data.matchId) return `/chat/${data.matchId}`;
            return null;

        case NOTIFICATION_TYPES.MATCH:
            return '/(tabs)/dates';

        default:
            return null;
    }
}

// ─── Android channel ──────────────────────────────────────────────────────────

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

// ─── Token registration ───────────────────────────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePushNotifications() {
    const toast = useToast();
    const router = useRouter();
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

    const notificationReceivedListener = useRef<Notifications.EventSubscription | null>(null);
    const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        // Foreground: show alert + sound + badge
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

        // ── Foreground: show in-app toast ────────────────────────────────────
        notificationReceivedListener.current =
            Notifications.addNotificationReceivedListener((notification) => {
                const content = notification.request.content;
                const data = (content.data || {}) as NotificationPayload;
                const message = content.body || content.title || 'New notification';

                toast.show({
                    message,
                    variant: toastVariantFor(data.type),
                    position: 'top',
                    duration: 4000,
                    showInModal: true,
                });
            });

        // ── Background/killed: handle tap → navigate ─────────────────────────
        notificationResponseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
                const content = response.notification.request.content;
                const data = (content.data || {}) as NotificationPayload;

                console.log('[Notifications] Tapped notification type:', data.type);

                const route = resolveRoute(data);
                if (route) {
                    console.log('[Notifications] Navigating to:', route);
                    router.push(route as any);
                }
            });

        return () => {
            notificationReceivedListener.current?.remove();
            notificationResponseListener.current?.remove();
        };
        // Stable refs — intentionally omit toast/router to avoid re-registering listeners
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { expoPushToken };
}
