import { getAuthHeaders } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Notification type constants ──────────────────────────────────────────────
// These strings must match what the backend sends in the `type` field of the
// notification payload data object.

export const NOTIFICATION_TYPES = {
    // Legacy
    MATCH: 'match',
    NEW_CANDIDATE_MATCH: 'new_candidate_match',
    MESSAGE: 'message',
    GENERIC: 'generic',

    // Date-flow types (new)
    DATE_REQUEST_RECEIVED: 'date_request_received',   // "Alex wants to go on a date with you 💜"
    DATE_REQUEST_ACCEPTED: 'date_request_accepted',   // "Sarah accepted your date invite! 🎉"
    DATE_REQUEST_DECLINED: 'date_request_declined',   // "Sarah passed on your request."
    MUTUAL_MATCH: 'mutual_match',                     // "It's a Date Match with Sarah! 💜"
    DATE_ARRANGING: 'date_arranging',                 // "We're arranging your date with Sarah"
    DATE_SCHEDULED: 'date_scheduled',                 // "Your date is set! Saturday 6PM 📍"
    FEEDBACK_PROMPT: 'feedback_prompt',               // "How was your date with Sarah? 💬"
    DATE_CANCELLED: 'date_cancelled',                 // "Your date with Sarah was cancelled."

    MEETUP_SLOT_ASSIGNED: 'meetup_slot_assigned',
    MEETUP_PARTNER_CONFIRMED: 'meetup_partner_confirmed',
    MEETUP_CONFIRM_REMINDER: 'meetup_confirm_reminder',

    MEETUP_RESCHEDULE_REQUESTED: 'meetup_reschedule_requested',
    MEETUP_RESCHEDULE_COUNTERED: 'meetup_reschedule_countered',
    MEETUP_RESCHEDULE_ACCEPTED: 'meetup_reschedule_accepted',
    MEETUP_RESCHEDULE_CANCELLED: 'meetup_reschedule_cancelled',

    PAYMENT_REQUIRED: 'payment_required',
    PAYMENT_PARTNER_PAID: 'payment_partner_paid',
    PAYMENT_BOTH_PAID: 'payment_both_paid',
    PAYMENT_EXPIRING: 'payment_expiring',
    PAYMENT_EXPIRED: 'payment_expired',
    CREDIT_GRANTED: 'credit_granted',
    REFUND_COMPLETED: 'refund_completed',

    // Soft-launch gating
    ADMITTED_FROM_WAITLIST: 'admitted_from_waitlist', // "You're in 💛" — user promoted from waitlist to admitted
    ADMIN_ANNOUNCEMENT: 'admin_announcement',         // Arbitrary broadcast from the admin console
} as const;

export type AppNotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// ─── Payload shape sent by the backend in notification.data ──────────────────
export interface NotificationPayload {
    type?: AppNotificationType;

    // IDs for deep-linking
    pairId?: string;
    matchId?: string;       // used for call / chat routes
    userId?: string;        // sender profile
    dateId?: string;        // used for feedback_prompt
    name?: string;          // first name of the other person (for feedback screen)
    mutualMatchId?: string;
    requestId?: string;     // pending meetup reschedule request

    // Legacy explicit route override (still supported)
    route?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const NotificationsService = {
    async registerPushToken(pushToken: string): Promise<void> {
        if (!API_URL) {
            throw new Error('EXPO_PUBLIC_API_URL is not set');
        }

        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/api/user/push-token`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ pushToken }),
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Failed to register push token (${response.status}): ${text}`);
        }
    },
};
