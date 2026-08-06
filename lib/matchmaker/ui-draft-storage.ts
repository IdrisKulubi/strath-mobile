import AsyncStorage from '@react-native-async-storage/async-storage';

const prefix = 'matchmaker:ui-draft:v2:';

export async function loadMatchmakerUiDraft(key: string) {
  return AsyncStorage.getItem(`${prefix}${key}`);
}

export async function saveMatchmakerUiDraft(key: string, value: string) {
  if (!value) return AsyncStorage.removeItem(`${prefix}${key}`);
  return AsyncStorage.setItem(`${prefix}${key}`, value);
}

export function clearMatchmakerUiDraft(key: string) {
  return AsyncStorage.removeItem(`${prefix}${key}`);
}
