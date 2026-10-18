/** One reminder per account per week, shared by every automatic trigger. */
export const NOTIFICATION_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export function isNotificationReminderDue(lastShown: string | null, now = Date.now()): boolean {
    const timestamp = Number(lastShown);
    return !Number.isFinite(timestamp) || timestamp <= 0 ||
        now - timestamp >= NOTIFICATION_REMINDER_INTERVAL_MS;
}
