import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import {
    NOTIFICATION_TYPES,
    type NotificationPayload,
    type AppNotificationType,
} from '@/lib/services/notifications-service';
import { useToast } from '@/components/ui/toast';
import {
    configureAndroidNotificationChannel,
    registerPushTokenIfGranted,
} from '@/lib/push-registration';

export type { AppNotificationType };

type ToastVariant = 'default' | 'accent' | 'warning' | 'danger';

function toastVariantFor(type?: AppNotificationType): ToastVariant {
    switch (type) {
        case NOTIFICATION_TYPES.MUTUAL_MATCH:
        case NOTIFICATION_TYPES.DATE_REQUEST_ACCEPTED:
        case NOTIFICATION_TYPES.DATE_ARRANGING:
        case NOTIFICATION_TYPES.DATE_SCHEDULED:
        case NOTIFICATION_TYPES.MEETUP_SLOT_ASSIGNED:
        case NOTIFICATION_TYPES.MEETUP_PARTNER_CONFIRMED:
        case NOTIFICATION_TYPES.MEETUP_CONFIRM_REMINDER:
        case NOTIFICATION_TYPES.NEW_CANDIDATE_MATCH:
        case NOTIFICATION_TYPES.MATCH:
            return 'accent';

        case NOTIFICATION_TYPES.DATE_REQUEST_DECLINED:
        case NOTIFICATION_TYPES.DATE_CANCELLED:
            return 'danger';

        default:
            return 'default';
    }
}

function resolveRoute(data: NotificationPayload): string | null {
    if (data.route) {
        if (data.route.includes('payments')) {
            return '/(tabs)/dates';
        }
        return data.route;
    }

    switch (data.type) {
        case NOTIFICATION_TYPES.DATE_REQUEST_RECEIVED:
        case NOTIFICATION_TYPES.DATE_REQUEST_ACCEPTED:
        case NOTIFICATION_TYPES.DATE_REQUEST_DECLINED:
        case NOTIFICATION_TYPES.MUTUAL_MATCH:
        case NOTIFICATION_TYPES.DATE_ARRANGING:
        case NOTIFICATION_TYPES.DATE_SCHEDULED:
        case NOTIFICATION_TYPES.DATE_CANCELLED:
        case NOTIFICATION_TYPES.MEETUP_PARTNER_CONFIRMED:
            return '/(tabs)/dates';

        case NOTIFICATION_TYPES.FEEDBACK_PROMPT:
            if (data.dateId) {
                const name = data.name ? `?name=${encodeURIComponent(data.name)}` : '';
                return `/feedback/${data.dateId}${name}`;
            }
            return '/(tabs)/dates';

        case NOTIFICATION_TYPES.MESSAGE:
            if (data.matchId) return `/chat/${data.matchId}`;
            return null;

        case NOTIFICATION_TYPES.MATCH:
            return '/(tabs)/dates';

        case NOTIFICATION_TYPES.NEW_CANDIDATE_MATCH:
        case NOTIFICATION_TYPES.MEETUP_SLOT_ASSIGNED:
        case NOTIFICATION_TYPES.MEETUP_CONFIRM_REMINDER:
            return '/(tabs)';

        case NOTIFICATION_TYPES.ADMITTED_FROM_WAITLIST:
            return '/';

        case NOTIFICATION_TYPES.ADMIN_ANNOUNCEMENT:
            return null;

        default:
            return null;
    }
}

export function usePushNotifications(options?: {
    onTokenRegistered?: (token: string | null) => void;
}) {
    const toast = useToast();
    const router = useRouter();
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

    const notificationReceivedListener = useRef<Notifications.EventSubscription | null>(null);
    const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });

        configureAndroidNotificationChannel().catch((e) =>
            console.warn('[Notifications] Failed configuring Android channel', e),
        );

        registerPushTokenIfGranted()
            .then((token) => {
                if (!token) return;
                setExpoPushToken(token);
                options?.onTokenRegistered?.(token);
            })
            .catch((e) => console.warn('[Notifications] Token registration error', e));

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

        notificationResponseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
                const content = response.notification.request.content;
                const data = (content.data || {}) as NotificationPayload;

                const route = resolveRoute(data);
                if (route) {
                    router.push(route as any);
                }
            });

        return () => {
            notificationReceivedListener.current?.remove();
            notificationResponseListener.current?.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { expoPushToken, setExpoPushToken };
}
