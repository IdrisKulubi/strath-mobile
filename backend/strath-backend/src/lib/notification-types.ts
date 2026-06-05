/**
 * Notification type constants shared across the backend.
 * These must match the NOTIFICATION_TYPES in the mobile client's
 * strath-mobile/lib/services/notifications-service.ts
 */
export const NOTIFICATION_TYPES = {
    // Legacy
    MATCH: 'match',
    /** New curated home introduction (candidate pair went live). */
    NEW_CANDIDATE_MATCH: 'new_candidate_match',
    MESSAGE: 'message',
    GENERIC: 'generic',

    // Date-flow
    DATE_REQUEST_RECEIVED: 'date_request_received',
    DATE_REQUEST_ACCEPTED: 'date_request_accepted',
    DATE_REQUEST_DECLINED: 'date_request_declined',
    MUTUAL_MATCH: 'mutual_match',
    DATE_ARRANGING: 'date_arranging',
    DATE_SCHEDULED: 'date_scheduled',
    FEEDBACK_PROMPT: 'feedback_prompt',
    DATE_CANCELLED: 'date_cancelled',

    // Meetup slot confirmation
    MEETUP_SLOT_ASSIGNED: 'meetup_slot_assigned',
    MEETUP_PARTNER_CONFIRMED: 'meetup_partner_confirmed',
    MEETUP_CONFIRM_REMINDER: 'meetup_confirm_reminder',

    // Meetup reschedule
    MEETUP_RESCHEDULE_REQUESTED: 'meetup_reschedule_requested',
    MEETUP_RESCHEDULE_COUNTERED: 'meetup_reschedule_countered',
    MEETUP_RESCHEDULE_ACCEPTED: 'meetup_reschedule_accepted',
    MEETUP_RESCHEDULE_CANCELLED: 'meetup_reschedule_cancelled',

    // Payments (pay-to-confirm)
    PAYMENT_REQUIRED: 'payment_required',
    PAYMENT_PARTNER_PAID: 'payment_partner_paid',
    PAYMENT_BOTH_PAID: 'payment_both_paid',
    PAYMENT_EXPIRING: 'payment_expiring',
    PAYMENT_EXPIRED: 'payment_expired',
    CREDIT_GRANTED: 'credit_granted',
    REFUND_COMPLETED: 'refund_completed',

    // Soft-launch gating
    ADMITTED_FROM_WAITLIST: 'admitted_from_waitlist',
    ADMIN_ANNOUNCEMENT: 'admin_announcement',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
