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
    HOME_EXPERIENCE_EXPOSED: "home_experience_exposed",
    MATCHMAKER_SESSION_STARTED: "matchmaker_session_started",
    MATCHMAKER_SESSION_OPENED: "matchmaker_session_opened",
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
    MATCHMAKER_BRIEF_MUTATED: "matchmaker_brief_mutated",
    MATCHMAKER_BRIEF_VIEWED: "matchmaker_brief_viewed",
    MATCHMAKER_BRIEF_VERSION_CONFLICT: "matchmaker_brief_version_conflict",
    MATCHMAKER_BRIEF_UNDONE: "matchmaker_brief_undone",
    MATCHMAKER_CLARIFICATION_RESOLVED: "matchmaker_clarification_resolved",
    MATCHMAKER_NEW_USER_CLARIFICATION_BYPASSED: "matchmaker_new_user_clarification_bypassed",
    MATCHMAKER_INFERRED_PREFERENCES_ARCHIVED: "matchmaker_inferred_preferences_archived",
    MATCHMAKER_SHORTLIST_REQUESTED: "matchmaker_shortlist_requested",
    MATCHMAKER_SHORTLIST_GENERATED: "matchmaker_shortlist_generated",
    MATCHMAKER_SHORTLIST_PARTIAL: "matchmaker_shortlist_partial",
    MATCHMAKER_SHORTLIST_EMPTY: "matchmaker_shortlist_empty",
    MATCHMAKER_SHORTLIST_FAILED: "matchmaker_shortlist_failed",
    MATCHMAKER_SHORTLIST_CREDIT_CONSUMED: "matchmaker_shortlist_credit_consumed",
    MATCHMAKER_SHORTLIST_VIEWED: "matchmaker_shortlist_viewed",
    MATCHMAKER_SHORTLIST_PAGE_CHANGED: "matchmaker_shortlist_page_changed",
    MATCHMAKER_EXPLANATION_EXPANDED: "matchmaker_explanation_expanded",
    MATCHMAKER_COMPARE_OPENED: "matchmaker_compare_opened",
    MATCHMAKER_COMPARISON_ROW_VIEWED: "matchmaker_comparison_row_viewed",
    MATCHMAKER_SHORTLIST_PROFILE_OPENED: "matchmaker_shortlist_profile_opened",
    MATCHMAKER_CANDIDATE_UNAVAILABLE: "matchmaker_candidate_unavailable",
    MATCHMAKER_FEEDBACK_CANDIDATE_ONLY: "matchmaker_feedback_candidate_only",
    MATCHMAKER_FEEDBACK_FOLLOW_UP_REQUESTED: "matchmaker_feedback_follow_up_requested",
    MATCHMAKER_FEEDBACK_FOLLOW_UP_COMPLETED: "matchmaker_feedback_follow_up_completed",
    MATCHMAKER_FEEDBACK_LEARNING_PREVIEWED: "matchmaker_feedback_learning_previewed",
    MATCHMAKER_FEEDBACK_LEARNING_CONFIRMED: "matchmaker_feedback_learning_confirmed",
    MATCHMAKER_FEEDBACK_LEARNING_CANCELLED: "matchmaker_feedback_learning_cancelled",
    MATCHMAKER_MUTUAL_CREATED: "matchmaker_mutual_created",
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
