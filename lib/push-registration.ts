import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { NotificationsService } from '@/lib/services/notifications-service';

const ANDROID_CHANNEL_ID = 'default';

function getProjectId(): string | undefined {
    return (
        (Constants.expoConfig as any)?.extra?.eas?.projectId ||
        (Constants as any)?.easConfig?.projectId
    );
}

export async function configureAndroidNotificationChannel(): Promise<void> {
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

/**
 * Requests OS permission if needed, fetches Expo push token, registers with backend.
 * Returns token string or null if unavailable/denied.
 */
export async function requestPushPermissionAndRegister(): Promise<string | null> {
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
    const token = tokenResponse.data;

    try {
        await NotificationsService.registerPushToken(token);
        console.log('[Notifications] Push token registered');
    } catch (e) {
        console.warn('[Notifications] Failed to register token with backend', e);
    }

    return token;
}

/** Register token when permission already granted (no OS dialog). */
export async function registerPushTokenIfGranted(): Promise<string | null> {
    if (!Device.isDevice) return null;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const projectId = getProjectId();
    if (!projectId) return null;

    try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenResponse.data;
        await NotificationsService.registerPushToken(token);
        return token;
    } catch (e) {
        console.warn('[Notifications] Silent token registration failed', e);
        return null;
    }
}
