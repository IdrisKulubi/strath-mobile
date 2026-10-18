import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isNotificationReminderDue, NOTIFICATION_REMINDER_INTERVAL_MS as week } from './notification-reminder-policy.ts';
test('first use and corrupt timestamps are eligible', () => {
  assert.equal(isNotificationReminderDue(null), true);
  assert.equal(isNotificationReminderDue('invalid'), true);
});
test('automatic prompts share a seven-day cooldown', () => {
  const shown = 1_800_000_000_000;
  assert.equal(isNotificationReminderDue(String(shown), shown), false);
  assert.equal(isNotificationReminderDue(String(shown), shown + week - 1), false);
  assert.equal(isNotificationReminderDue(String(shown), shown + week), true);
  assert.equal(isNotificationReminderDue(String(shown), shown - 1000), false);
});
