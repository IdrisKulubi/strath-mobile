import type { MatchmakerBrief, MatchmakerBriefPreference } from '@/types/matchmaker';

export type MatchmakerBriefGroupKey =
  | 'mustHaves'
  | 'preferences'
  | 'flexible'
  | 'avoids'
  | 'stillLearning';

export type MatchmakerBriefGroups = Record<MatchmakerBriefGroupKey, MatchmakerBriefPreference[]>;

export const MATCHMAKER_BRIEF_GROUP_LABELS: Record<MatchmakerBriefGroupKey, string> = {
  mustHaves: 'Must-haves',
  preferences: 'Preferences',
  flexible: 'Flexible',
  avoids: 'Avoids',
  stillLearning: 'Still learning',
};

export function groupMatchmakerBrief(brief?: MatchmakerBrief | null): MatchmakerBriefGroups {
  const groups: MatchmakerBriefGroups = {
    mustHaves: [],
    preferences: [],
    flexible: [],
    avoids: [],
    stillLearning: [],
  };

  for (const preference of brief?.preferences ?? []) {
    if (preference.status !== 'active') continue;
    if (preference.certainty === 'inferred') {
      groups.stillLearning.push(preference);
    } else if (preference.sentiment === 'avoid') {
      groups.avoids.push(preference);
    } else if (preference.importance === 'must_have') {
      groups.mustHaves.push(preference);
    } else if (preference.importance === 'flexible') {
      groups.flexible.push(preference);
    } else {
      groups.preferences.push(preference);
    }
  }
  return groups;
}

export function summarizeMatchmakerBrief(brief?: MatchmakerBrief | null) {
  const groups = groupMatchmakerBrief(brief);
  const confirmed = groups.mustHaves.length + groups.preferences.length + groups.flexible.length + groups.avoids.length;
  const learning = groups.stillLearning.length;
  if (confirmed === 0 && learning === 0) return 'Start with what matters most; you can change it anytime.';
  if (learning === 0) return `${confirmed} ${confirmed === 1 ? 'detail' : 'details'} guiding your matches.`;
  return `${confirmed} confirmed · ${learning} still ${learning === 1 ? 'needs' : 'need'} your say.`;
}
