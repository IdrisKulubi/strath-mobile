import * as SecureStore from 'expo-secure-store';

export const DATING_SETUP_DRAFT_VERSION = 1;

export type DatingSetupDraft = {
  version: number;
  beat: number;
  name: string;
  birthDate: string;
  gender: string;
  genderInterests: string[];
  minAge: string;
  maxAge: string;
  city: string;
  intention: string;
  bio: string;
  photos: string[];
  university: string;
  course: string;
  yearOfStudy: string;
  coordinates: { latitude: number; longitude: number } | null;
  radius: string;
};

export function datingSetupDraftKey(userId: string) {
  return `dating_setup_draft_v1_${userId}`;
}

let setupResumeDismissedThisSession = false;

export function markSetupResumeDismissed() {
  setupResumeDismissedThisSession = true;
}

export function isSetupResumeDismissed() {
  return setupResumeDismissedThisSession;
}

export async function readDatingSetupDraft(userId: string): Promise<DatingSetupDraft | null> {
  try {
    const raw = await SecureStore.getItemAsync(datingSetupDraftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DatingSetupDraft;
    if (parsed.version !== DATING_SETUP_DRAFT_VERSION) return null;
    if (!Number.isFinite(parsed.beat)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readSetupDraftBeat(userId: string): Promise<number | null> {
  const draft = await readDatingSetupDraft(userId);
  return draft ? draft.beat : null;
}

export async function saveDatingSetupDraft(userId: string, draft: DatingSetupDraft) {
  await SecureStore.setItemAsync(datingSetupDraftKey(userId), JSON.stringify(draft));
}

export async function clearDatingSetupDraft(userId: string) {
  try {
    await SecureStore.deleteItemAsync(datingSetupDraftKey(userId));
  } catch {
    /* Server save is still authoritative. */
  }
}
