import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { getAuthHeaders } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type PrePermissionContext = 'mutual_match' | 'after_confirm' | 'settings';

const STORAGE_PREFIX = 'strathspace:push_pre_prompt:';

function storageKey(context: PrePermissionContext): string {
    return `${STORAGE_PREFIX}${context}`;
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

    const seen = await AsyncStorage.getItem(storageKey(context));
    if (context === 'settings') return true;
    return seen !== 'dismissed';
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
    await AsyncStorage.setItem(storageKey(context), outcome);
    void reportPushPrePromptOutcome(context, outcome);
}
