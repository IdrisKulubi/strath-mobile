import type { MatchmakerBrief, MatchmakerCandidate, MatchmakerCandidateExplanation, MatchmakerConversationMessage, MatchmakerShortlist } from '@/types/matchmaker';

export function clampShortlistPosition(position: number, candidateCount: number) {
  if (candidateCount <= 0) return 0;
  return Math.max(0, Math.min(Math.floor(position), candidateCount - 1));
}

export function buildShortlistComparison(brief: MatchmakerBrief | undefined, shortlist: MatchmakerShortlist) {
  return (brief?.preferences ?? [])
    .filter((preference) => preference.status === 'active' && preference.certainty === 'confirmed' && preference.sentiment === 'prefer')
    .map((preference) => ({
      preferenceId: preference.id,
      label: preference.value,
      candidates: shortlist.candidates.map((candidate) => ({
        candidateUserId: candidate.candidateUserId,
        evidence: candidate.availability === 'unavailable'
          ? 'Unavailable' as const
          : candidate.explanation?.matchedPreferenceIds.includes(preference.id)
            ? 'Strong evidence' as const
            : 'Not enough information' as const,
      })),
    }));
}

export function shouldShowShortlistComparison(candidateCount: number, comparisonRowCount: number) {
  return candidateCount > 1 && comparisonRowCount > 0;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function explanation(value: unknown): MatchmakerCandidateExplanation | undefined {
  const raw = record(value);
  if (!raw) return undefined;
  return {
    fitReasons: strings(raw.fitReasons).slice(0, 3),
    matchedPreferenceIds: strings(raw.matchedPreferenceIds),
    reciprocalFitEvidence: strings(raw.reciprocalFitEvidence),
    tradeoff: typeof raw.tradeoff === 'string' ? raw.tradeoff : null,
    unknown: typeof raw.unknown === 'string' ? raw.unknown : null,
  };
}

function candidate(value: unknown): MatchmakerCandidate | null {
  const raw = record(value);
  if (!raw || typeof raw.candidateUserId !== 'string' || typeof raw.reason !== 'string') return null;
  return {
    candidateUserId: raw.candidateUserId,
    firstName: typeof raw.firstName === 'string' ? raw.firstName : null,
    age: typeof raw.age === 'number' ? raw.age : null,
    university: typeof raw.university === 'string' ? raw.university : null,
    course: typeof raw.course === 'string' ? raw.course : null,
    profilePhoto: typeof raw.profilePhoto === 'string' ? raw.profilePhoto : null,
    photos: strings(raw.photos),
    reason: raw.reason,
    labels: strings(raw.labels),
    explanation: explanation(raw.explanation),
    shortlistPosition: typeof raw.shortlistPosition === 'number' ? raw.shortlistPosition : undefined,
  };
}

export function readMatchmakerShortlist(message?: MatchmakerConversationMessage | null): MatchmakerShortlist | null {
  const raw = record(message?.metadata?.shortlist);
  if (!raw || typeof raw.id !== 'string' || !Array.isArray(raw.candidates)) return null;
  const candidates = raw.candidates.map(candidate).filter((item): item is MatchmakerCandidate => Boolean(item));
  if (candidates.length < 1 || candidates.length > 3) return null;
  return {
    id: raw.id,
    briefVersion: typeof raw.briefVersion === 'number' ? raw.briefVersion : 0,
    candidates,
  };
}

export function candidateAtShortlistPosition(shortlist: MatchmakerShortlist, position: number) {
  return shortlist.candidates[Math.max(0, Math.min(position, shortlist.candidates.length - 1))] ?? null;
}
