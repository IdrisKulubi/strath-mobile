import type { MatchmakerBriefOperation } from "@/lib/matchmaker/preference-domain";

export const MATCHMAKER_FEEDBACK_REASON_CODES = [
    "lifestyle_mismatch",
    "relationship_goals",
    "communication_style",
    "attraction",
    "practical_mismatch",
    "something_else",
] as const;

export type MatchmakerFeedbackReasonCode = typeof MATCHMAKER_FEEDBACK_REASON_CODES[number];

export interface MatchmakerFeedbackLearningProposal {
    reasonCode: MatchmakerFeedbackReasonCode;
    summary: string;
    operation: MatchmakerBriefOperation;
}

const PERSONALITY_TOKEN = /\b(?:infj|enfj|intj|entj|isfj|esfj|istj|estj|isfp|esfp|istp|estp|infp|enfp|intp|entp)\b/gi;
const INTERNAL_PREFIX = /\b(?:avoid|prefer|interest|quality)\s*:\s*/gi;

export function sanitizeMatchmakerFeedbackDetail(value?: string | null) {
    if (!value) return null;
    const sanitized = value
        .replace(INTERNAL_PREFIX, "")
        .replace(/[_|]+/g, " ")
        .replace(PERSONALITY_TOKEN, "")
        .replace(/[<>\[\]{}]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 240);
    return sanitized || null;
}

export function sanitizeMatchmakerMemoryLabel(value: string) {
    const sanitized = sanitizeMatchmakerFeedbackDetail(
        value.replace(/^(?:avoid|prefer|interest|quality)[\s_:]+/i, ""),
    );
    if (!sanitized || /^(?:never|undefined|null|unknown|none)$/i.test(sanitized)) return null;
    return sanitized;
}

export function feedbackReasonNeedsDetail(reasonCode: MatchmakerFeedbackReasonCode) {
    return reasonCode !== "relationship_goals";
}

export function hasRecordedFeedbackSubmission(history: unknown, submissionId?: string | null) {
    if (!submissionId || !Array.isArray(history)) return false;
    return history.some((item) => Boolean(
        item && typeof item === "object" && (item as Record<string, unknown>).submissionId === submissionId,
    ));
}

export function feedbackFollowUpQuestion(reasonCode: MatchmakerFeedbackReasonCode) {
    switch (reasonCode) {
        case "lifestyle_mismatch": return "What part of your daily rhythm felt different?";
        case "communication_style": return "What communication style would work better for you?";
        case "attraction": return "What should I keep in mind for future matches? Keep it kind and specific.";
        case "practical_mismatch": return "Which practical detail should I account for next time?";
        case "something_else": return "What is the one thing I should understand?";
        default: return null;
    }
}

export function buildMatchmakerFeedbackProposal(input: {
    reasonCode: MatchmakerFeedbackReasonCode;
    detail?: string | null;
}): MatchmakerFeedbackLearningProposal | null {
    const detail = sanitizeMatchmakerFeedbackDetail(input.detail);
    if (feedbackReasonNeedsDetail(input.reasonCode) && !detail) return null;

    const base = {
        type: "add" as const,
        importance: "prefer" as const,
        certainty: "confirmed" as const,
        source: "feedback" as const,
        metadata: { reasonCode: input.reasonCode, userConfirmed: true },
    };

    switch (input.reasonCode) {
        case "relationship_goals":
            return {
                reasonCode: input.reasonCode,
                summary: "Prefer clearly aligned relationship goals",
                operation: { ...base, category: "relationship_intent", value: "clearly aligned relationship goals", sentiment: "prefer" },
            };
        case "lifestyle_mismatch":
            return {
                reasonCode: input.reasonCode,
                summary: `Avoid this lifestyle mismatch: ${detail}`,
                operation: { ...base, category: "lifestyle", value: detail!, sentiment: "avoid" },
            };
        case "communication_style":
            return {
                reasonCode: input.reasonCode,
                summary: `Prefer this communication style: ${detail}`,
                operation: { ...base, category: "communication", value: detail!, sentiment: "prefer" },
            };
        case "attraction":
            return {
                reasonCode: input.reasonCode,
                summary: `Keep this attraction preference in mind: ${detail}`,
                operation: { ...base, category: "attraction", value: detail!, sentiment: "prefer" },
            };
        case "practical_mismatch":
            return {
                reasonCode: input.reasonCode,
                summary: `Avoid this practical mismatch: ${detail}`,
                operation: { ...base, category: "practical", value: detail!, sentiment: "avoid" },
            };
        case "something_else":
            return {
                reasonCode: input.reasonCode,
                summary: `Keep this preference in mind: ${detail}`,
                operation: { ...base, category: "other", value: detail!, sentiment: "prefer" },
            };
    }
}
