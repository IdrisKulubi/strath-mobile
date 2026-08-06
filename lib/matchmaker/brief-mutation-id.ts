import type { MatchmakerBriefMutationInput } from '@/types/matchmaker';

export function buildMatchmakerBriefMutationId(input: MatchmakerBriefMutationInput) {
  const value = JSON.stringify([input.baseVersion, input.operations]);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `brief-${input.baseVersion}-${(hash >>> 0).toString(36)}`;
}
