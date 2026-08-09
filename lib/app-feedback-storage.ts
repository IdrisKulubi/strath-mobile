import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    lastSubmittedAt: 'strathspace_app_feedback_last_submitted_at',
    matchmakerPromptShownOn: 'strathspace_matchmaker_feedback_prompt_shown_on',
} as const;

async function setNumber(key: string, value: number): Promise<void> {
    try {
        await AsyncStorage.setItem(key, String(value));
    } catch {
        // noop
    }
}

export async function markFeedbackSubmitted(): Promise<void> {
    await setNumber(KEYS.lastSubmittedAt, Date.now());
}

async function getString(key: string): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(key);
    } catch {
        return null;
    }
}

async function setString(key: string, value: string): Promise<void> {
    try {
        await AsyncStorage.setItem(key, value);
    } catch {
        // noop
    }
}

export async function shouldShowMatchmakerFeedbackPrompt(sessionDay: string): Promise<boolean> {
    const shownOn = await getString(KEYS.matchmakerPromptShownOn);
    return shownOn !== sessionDay;
}

export async function markMatchmakerFeedbackPromptShown(sessionDay: string): Promise<void> {
    await setString(KEYS.matchmakerPromptShownOn, sessionDay);
}
