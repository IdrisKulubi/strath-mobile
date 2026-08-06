import type { MatchmakerFeedbackReasonCode } from '@/types/matchmaker';

export const MATCHMAKER_FEEDBACK_REASONS: readonly {
  code: MatchmakerFeedbackReasonCode;
  label: string;
  needsFutureDetail: boolean;
  followUp: string | null;
}[] = [
  { code: 'lifestyle_mismatch', label: 'Lifestyle mismatch', needsFutureDetail: true, followUp: 'What part of your daily rhythm felt different?' },
  { code: 'relationship_goals', label: 'Relationship goals', needsFutureDetail: false, followUp: null },
  { code: 'communication_style', label: 'Communication style', needsFutureDetail: true, followUp: 'What communication style would work better for you?' },
  { code: 'attraction', label: 'Attraction', needsFutureDetail: true, followUp: 'What should I keep in mind for future matches? Keep it kind and specific.' },
  { code: 'practical_mismatch', label: 'Practical mismatch', needsFutureDetail: true, followUp: 'Which practical detail should I account for next time?' },
  { code: 'something_else', label: 'Something else', needsFutureDetail: true, followUp: 'What is the one thing I should understand?' },
];

export function feedbackReason(code: MatchmakerFeedbackReasonCode) {
  return MATCHMAKER_FEEDBACK_REASONS.find((reason) => reason.code === code)!;
}

function cleanDetail(value: string) {
  return value
    .replace(/\b(?:avoid|prefer|interest|quality)\s*:\s*/gi, '')
    .replace(/[_|]+/g, ' ')
    .replace(/\b(?:infj|enfj|intj|entj|isfj|esfj|istj|estj|isfp|esfp|istp|estp|infp|enfp|intp|entp)\b/gi, '')
    .replace(/[<>\[\]{}]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function buildFeedbackLearningPreview(code: MatchmakerFeedbackReasonCode, rawDetail = '') {
  const detail = cleanDetail(rawDetail);
  switch (code) {
    case 'relationship_goals': return 'Prefer clearly aligned relationship goals';
    case 'lifestyle_mismatch': return detail ? `Avoid this lifestyle mismatch: ${detail}` : null;
    case 'communication_style': return detail ? `Prefer this communication style: ${detail}` : null;
    case 'attraction': return detail ? `Keep this attraction preference in mind: ${detail}` : null;
    case 'practical_mismatch': return detail ? `Avoid this practical mismatch: ${detail}` : null;
    case 'something_else': return detail ? `Keep this preference in mind: ${detail}` : null;
  }
}
