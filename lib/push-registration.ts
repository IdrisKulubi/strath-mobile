import { Alert, Linking, Platform } from 'react-native';
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

/** Opens the Strathspace app page in system settings (notifications toggle lives here). */
export async function openAppNotificationSettings(): Promise<boolean> {
    try {
        await Linking.openSettings();
        return true;
    } catch {
        Alert.alert(
            'Notifications',
            Platform.OS === 'ios'
                ? 'Open Settings, tap Strathspace, then turn on Notifications.'
                : 'Open Settings, tap Apps, then Strathspace, and turn on Notifications.',
        );
        return false;
    }
}

/**
 * User tapped Enable on the pre-permission sheet or settings.
 * Shows the system dialog when allowed; otherwise opens app notification settings.
 */
export async function enablePushNotificationsFromUserAction(): Promise<string | null> {
    if (!Device.isDevice) {
        Alert.alert('Notifications', 'Push notifications require a physical device.');
        return null;
    }

    const existing = await Notifications.getPermissionsAsync();

    if (existing.status === 'granted') {
        return registerPushTokenIfGranted();
    }

    const canRequestInApp =
        existing.status === 'undetermined' || existing.canAskAgain !== false;

    if (canRequestInApp) {
        const requested = await Notifications.requestPermissionsAsync();
        if (requested.status === 'granted') {
            await configureAndroidNotificationChannel();
            return requestPushPermissionAndRegister();
        }
    }

    await openAppNotificationSettings();
    return null;
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
