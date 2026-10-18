import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@reschedule_dismissed:';

export async function isRescheduleModalDismissed(requestId: string): Promise<boolean> {
    const value = await AsyncStorage.getItem(`${PREFIX}${requestId}`);
    return value === '1';
}

export async function markRescheduleModalDismissed(requestId: string): Promise<void> {
    await AsyncStorage.setItem(`${PREFIX}${requestId}`, '1');
}

export async function clearRescheduleModalDismissed(requestId: string): Promise<void> {
    await AsyncStorage.removeItem(`${PREFIX}${requestId}`);
}
