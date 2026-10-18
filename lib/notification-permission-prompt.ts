import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { getAuthHeaders, getCurrentUserId } from '@/lib/auth-helpers';

import { isNotificationReminderDue } from './notification-reminder-policy';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type PrePermissionContext = 'mutual_match' | 'after_confirm' | 'settings' | 'reminder';

const STORAGE_PREFIX = 'strathspace:push_pre_prompt:';

async function storageKey(): Promise<string | null> {
    const userId = await getCurrentUserId();
    return userId ? `${STORAGE_PREFIX}${userId}:last-shown` : null;
}

export async function getPushPermissionStatus(): Promise<Notifications.PermissionStatus> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
}

export async function shouldShowPrePermissionPrompt(
    context: PrePermissionContext,
): Promise<boolean> {
    const status = await getPushPermissionStatus();
    if (status === 'granted') return false;

    const key = await storageKey();
    if (!key) return false;
    if (context === 'settings') return true;
    return isNotificationReminderDue(await AsyncStorage.getItem(key));
}

async function reportPushPrePromptOutcome(
    context: PrePermissionContext,
    outcome: 'dismissed' | 'accepted',
): Promise<void> {
    if (!API_URL) return;

    try {
        const headers = await getAuthHeaders();
        await fetch(`${API_URL}/api/user/push-prompt-outcome`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ context, outcome }),
        });
    } catch {
        // Best-effort analytics for admin insights.
    }
}

export async function markPrePermissionPromptSeen(
    context: PrePermissionContext,
    outcome: 'dismissed' | 'accepted',
): Promise<void> {
    const key = await storageKey();
    if (key) await AsyncStorage.setItem(key, String(Date.now()));
    void reportPushPrePromptOutcome(context, outcome);
}

export async function markPrePermissionPromptShown(): Promise<void> {
    const key = await storageKey();
    if (key) await AsyncStorage.setItem(key, String(Date.now()));
}
