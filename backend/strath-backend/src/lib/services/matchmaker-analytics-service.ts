import { EVENT_TYPES, logEvent } from "@/lib/analytics";

export type MatchmakerAnalyticsEvent =
    | "session_started"
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
    | "limit_refinement_submitted";

const EVENT_TYPE_BY_NAME: Record<MatchmakerAnalyticsEvent, string> = {
    session_started: EVENT_TYPES.MATCHMAKER_SESSION_STARTED,
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
