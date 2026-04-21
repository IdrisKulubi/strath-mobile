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
    CALL: 'call',
    GENERIC: 'generic',

    // Date-flow
    DATE_REQUEST_RECEIVED: 'date_request_received',
    DATE_REQUEST_ACCEPTED: 'date_request_accepted',
    DATE_REQUEST_DECLINED: 'date_request_declined',
    MUTUAL_MATCH: 'mutual_match',
    CALL_REMINDER: 'call_reminder',
    DATE_SCHEDULED: 'date_scheduled',
    FEEDBACK_PROMPT: 'feedback_prompt',
    DATE_CANCELLED: 'date_cancelled',

    // Payments (docs/payment.md §12)
    PAYMENT_REQUIRED: 'payment_required',
    PARTNER_PAID: 'partner_paid',
    PAYMENT_REMINDER_12H: 'payment_reminder_12h',
    PAYMENT_EXPIRED: 'payment_expired',
    CREDIT_GRANTED: 'credit_granted',
    DATE_BEING_ARRANGED: 'date_being_arranged',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
