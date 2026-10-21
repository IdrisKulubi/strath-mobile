import AsyncStorage from '@react-native-async-storage/async-storage';
import { clampShortlistPosition } from '@/lib/matchmaker/shortlist';

const positionCache = new Map<string, number>();
const STORAGE_PREFIX = 'matchmaker-shortlist-position:';

export function getCachedShortlistPosition(shortlistId: string, candidateCount: number) {
  return clampShortlistPosition(positionCache.get(shortlistId) ?? 0, candidateCount);
}

export async function restoreShortlistPosition(shortlistId: string, candidateCount: number) {
  const cached = positionCache.get(shortlistId);
  if (cached !== undefined) return clampShortlistPosition(cached, candidateCount);
  try {
    const stored = await AsyncStorage.getItem(`${STORAGE_PREFIX}${shortlistId}`);
    const restored = clampShortlistPosition(Number.parseInt(stored ?? '0', 10) || 0, candidateCount);
    positionCache.set(shortlistId, restored);
    return restored;
  } catch {
    return 0;
  }
}

export async function rememberShortlistPosition(shortlistId: string, position: number, candidateCount: number) {
  const next = clampShortlistPosition(position, candidateCount);
  positionCache.set(shortlistId, next);
  try {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${shortlistId}`, String(next));
  } catch {
    // Memory cache still preserves the position for the current app session.
  }
  return next;
}
