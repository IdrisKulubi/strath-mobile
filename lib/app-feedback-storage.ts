import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    lastSubmittedAt: 'strathspace_app_feedback_last_submitted_at',
    nudgeLastShownAt: 'strathspace_app_feedback_nudge_last_shown_at',
    nudgeDismissedCount: 'strathspace_app_feedback_nudge_dismissed_count',
    firstSeenAt: 'strathspace_app_feedback_first_seen_at',
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface FeedbackNudgeEligibility {
    eligible: boolean;
    reason?: string;
}

async function getNumber(key: string): Promise<number | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;
    }
}

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

export async function markNudgeShown(): Promise<void> {
    await setNumber(KEYS.nudgeLastShownAt, Date.now());
}

export async function markNudgeDismissed(): Promise<void> {
    try {
        const current = (await getNumber(KEYS.nudgeDismissedCount)) ?? 0;
        await setNumber(KEYS.nudgeDismissedCount, current + 1);
        await setNumber(KEYS.nudgeLastShownAt, Date.now());
    } catch {
        // noop
    }
}

async function ensureFirstSeen(): Promise<number> {
    const existing = await getNumber(KEYS.firstSeenAt);
    if (existing) return existing;
    const now = Date.now();
    await setNumber(KEYS.firstSeenAt, now);
    return now;
}

/**
 * Decide whether to show the contextual feedback nudge.
 *
 * Rules (kept intentionally cautious to avoid nagging):
 * - User must have had the app for at least 3 days.
 * - Never show if they've submitted feedback in the last 30 days.
 * - Never show if they've dismissed it 3+ times (permanently quiet).
 * - Otherwise, respect a 14-day cooldown between shows.
 */
export async function isNudgeEligible(): Promise<FeedbackNudgeEligibility> {
    try {
        const now = Date.now();
        const firstSeen = await ensureFirstSeen();

        if (now - firstSeen < 3 * DAY_MS) {
            return { eligible: false, reason: 'too_new' };
        }

        const dismissedCount = (await getNumber(KEYS.nudgeDismissedCount)) ?? 0;
        if (dismissedCount >= 3) {
            return { eligible: false, reason: 'dismissed_permanently' };
        }

        const lastSubmitted = await getNumber(KEYS.lastSubmittedAt);
        if (lastSubmitted && now - lastSubmitted < 30 * DAY_MS) {
            return { eligible: false, reason: 'recently_submitted' };
        }

        const lastShown = await getNumber(KEYS.nudgeLastShownAt);
        if (lastShown && now - lastShown < 14 * DAY_MS) {
            return { eligible: false, reason: 'cooldown' };
        }

        return { eligible: true };
    } catch {
        return { eligible: false, reason: 'error' };
    }
}
