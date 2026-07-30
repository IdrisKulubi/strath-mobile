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
    MATCHMAKER_SESSION_STARTED: "matchmaker_session_started",
    MATCHMAKER_INTENT_SUBMITTED: "matchmaker_intent_submitted",
    MATCHMAKER_CLARIFICATION_ASKED: "matchmaker_clarification_asked",
    MATCHMAKER_SEARCH_PLAN_CONFIRMED: "matchmaker_search_plan_confirmed",
    MATCHMAKER_CANDIDATE_SHOWN: "matchmaker_candidate_shown",
    MATCHMAKER_PROFILE_OPENED: "matchmaker_profile_opened",
    MATCHMAKER_INTERESTED: "matchmaker_interested",
    MATCHMAKER_PASS: "matchmaker_pass",
    MATCHMAKER_FEEDBACK_REASON_SELECTED: "matchmaker_feedback_reason_selected",
    MATCHMAKER_QUOTA_REACHED: "matchmaker_quota_reached",
    MATCHMAKER_SEARCH_BLOCKED_LIMIT: "matchmaker_search_blocked_limit",
    MATCHMAKER_LIMIT_REFINEMENT_SUBMITTED: "matchmaker_limit_refinement_submitted",
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
