import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

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

export async function markPrePermissionPromptSeen(
    context: PrePermissionContext,
    outcome: 'dismissed' | 'accepted',
): Promise<void> {
    await AsyncStorage.setItem(storageKey(context), outcome);
}
