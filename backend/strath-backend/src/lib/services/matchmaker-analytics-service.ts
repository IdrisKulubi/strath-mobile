import { EVENT_TYPES, logEvent } from "@/lib/analytics";

export type MatchmakerAnalyticsEvent =
    | "session_started"
    | "session_opened"
    | "intent_submitted"
    | "clarification_asked"
    | "search_plan_confirmed"
    | "candidate_shown"
    | "profile_opened"
    | "interested"
    | "pass"
    | "feedback_reason_selected"
    | "quota_reached"
    | "search_blocked_limit"
    | "limit_refinement_submitted"
    | "brief_mutated"
    | "brief_viewed"
    | "brief_version_conflict"
    | "brief_undone"
    | "clarification_resolved"
    | "new_user_clarification_bypassed"
    | "inferred_preferences_archived"
    | "shortlist_requested"
    | "shortlist_generated"
    | "shortlist_partial"
    | "shortlist_empty"
    | "shortlist_failed"
    | "shortlist_credit_consumed"
    | "shortlist_viewed"
    | "shortlist_page_changed"
    | "explanation_expanded"
    | "compare_opened"
    | "comparison_row_viewed"
    | "shortlist_profile_opened"
    | "candidate_unavailable"
    | "feedback_candidate_only"
    | "feedback_follow_up_requested"
    | "feedback_follow_up_completed"
    | "feedback_learning_previewed"
    | "feedback_learning_confirmed"
    | "feedback_learning_cancelled"
    | "mutual_created";

const EVENT_TYPE_BY_NAME: Record<MatchmakerAnalyticsEvent, string> = {
    session_started: EVENT_TYPES.MATCHMAKER_SESSION_STARTED,
    session_opened: EVENT_TYPES.MATCHMAKER_SESSION_OPENED,
    intent_submitted: EVENT_TYPES.MATCHMAKER_INTENT_SUBMITTED,
    clarification_asked: EVENT_TYPES.MATCHMAKER_CLARIFICATION_ASKED,
    search_plan_confirmed: EVENT_TYPES.MATCHMAKER_SEARCH_PLAN_CONFIRMED,
    candidate_shown: EVENT_TYPES.MATCHMAKER_CANDIDATE_SHOWN,
    profile_opened: EVENT_TYPES.MATCHMAKER_PROFILE_OPENED,
    interested: EVENT_TYPES.MATCHMAKER_INTERESTED,
    pass: EVENT_TYPES.MATCHMAKER_PASS,
    feedback_reason_selected: EVENT_TYPES.MATCHMAKER_FEEDBACK_REASON_SELECTED,
    quota_reached: EVENT_TYPES.MATCHMAKER_QUOTA_REACHED,
    search_blocked_limit: EVENT_TYPES.MATCHMAKER_SEARCH_BLOCKED_LIMIT,
    limit_refinement_submitted: EVENT_TYPES.MATCHMAKER_LIMIT_REFINEMENT_SUBMITTED,
    brief_mutated: EVENT_TYPES.MATCHMAKER_BRIEF_MUTATED,
    brief_viewed: EVENT_TYPES.MATCHMAKER_BRIEF_VIEWED,
    brief_version_conflict: EVENT_TYPES.MATCHMAKER_BRIEF_VERSION_CONFLICT,
    brief_undone: EVENT_TYPES.MATCHMAKER_BRIEF_UNDONE,
    clarification_resolved: EVENT_TYPES.MATCHMAKER_CLARIFICATION_RESOLVED,
    new_user_clarification_bypassed: EVENT_TYPES.MATCHMAKER_NEW_USER_CLARIFICATION_BYPASSED,
    inferred_preferences_archived: EVENT_TYPES.MATCHMAKER_INFERRED_PREFERENCES_ARCHIVED,
    shortlist_requested: EVENT_TYPES.MATCHMAKER_SHORTLIST_REQUESTED,
    shortlist_generated: EVENT_TYPES.MATCHMAKER_SHORTLIST_GENERATED,
    shortlist_partial: EVENT_TYPES.MATCHMAKER_SHORTLIST_PARTIAL,
    shortlist_empty: EVENT_TYPES.MATCHMAKER_SHORTLIST_EMPTY,
    shortlist_failed: EVENT_TYPES.MATCHMAKER_SHORTLIST_FAILED,
    shortlist_credit_consumed: EVENT_TYPES.MATCHMAKER_SHORTLIST_CREDIT_CONSUMED,
    shortlist_viewed: EVENT_TYPES.MATCHMAKER_SHORTLIST_VIEWED,
    shortlist_page_changed: EVENT_TYPES.MATCHMAKER_SHORTLIST_PAGE_CHANGED,
    explanation_expanded: EVENT_TYPES.MATCHMAKER_EXPLANATION_EXPANDED,
    compare_opened: EVENT_TYPES.MATCHMAKER_COMPARE_OPENED,
    comparison_row_viewed: EVENT_TYPES.MATCHMAKER_COMPARISON_ROW_VIEWED,
    shortlist_profile_opened: EVENT_TYPES.MATCHMAKER_SHORTLIST_PROFILE_OPENED,
    candidate_unavailable: EVENT_TYPES.MATCHMAKER_CANDIDATE_UNAVAILABLE,
    feedback_candidate_only: EVENT_TYPES.MATCHMAKER_FEEDBACK_CANDIDATE_ONLY,
    feedback_follow_up_requested: EVENT_TYPES.MATCHMAKER_FEEDBACK_FOLLOW_UP_REQUESTED,
    feedback_follow_up_completed: EVENT_TYPES.MATCHMAKER_FEEDBACK_FOLLOW_UP_COMPLETED,
    feedback_learning_previewed: EVENT_TYPES.MATCHMAKER_FEEDBACK_LEARNING_PREVIEWED,
    feedback_learning_confirmed: EVENT_TYPES.MATCHMAKER_FEEDBACK_LEARNING_CONFIRMED,
    feedback_learning_cancelled: EVENT_TYPES.MATCHMAKER_FEEDBACK_LEARNING_CANCELLED,
    mutual_created: EVENT_TYPES.MATCHMAKER_MUTUAL_CREATED,
};

export function trackMatchmakerEvent(input: {
    event: MatchmakerAnalyticsEvent;
    userId?: string | null;
    sessionId?: string | null;
    candidateUserId?: string | null;
    metadata?: Record<string, unknown>;
}) {
    const eventType = EVENT_TYPE_BY_NAME[input.event];
    return logEvent(eventType as typeof EVENT_TYPES[keyof typeof EVENT_TYPES], input.userId, {
        source: "matchmaker",
        sessionId: input.sessionId ?? null,
        candidateUserId: input.candidateUserId ?? null,
        ...(input.metadata ?? {}),
    });
}
