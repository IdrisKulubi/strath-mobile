import { db } from "@/lib/db";
import { analyticsEvents } from "@/db/schema";

export const EVENT_TYPES = {
    PROFILE_CREATED: "profile_created",
    DATE_REQUEST_SENT: "date_request_sent",
    DATE_REQUEST_ACCEPTED: "date_request_accepted",
    DATE_REQUEST_DECLINED: "date_request_declined",
    CALL_COMPLETED: "call_completed",
    DATE_SCHEDULED: "date_scheduled",
    DATE_ATTENDED: "date_attended",
    FEEDBACK_SUBMITTED: "feedback_submitted",
    PUSH_TOKEN_REGISTERED: "push_token_registered",
    PUSH_PRE_PROMPT: "push_pre_prompt",
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

export async function logEvent(
    eventType: EventType,
    userId?: string | null,
    metadata?: Record<string, unknown>
) {
    try {
        await db.insert(analyticsEvents).values({
            eventType,
            userId: userId ?? null,
            metadata: metadata ?? {},
        });
    } catch (err) {
        console.error("[analytics] Failed to log event:", eventType, err);
    }
}
