import AsyncStorage from '@react-native-async-storage/async-storage';

const INTRO_SLIDES_KEY = 'strathspace_intro_slides_v1';

export async function hasCompletedIntroSlides(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(INTRO_SLIDES_KEY);
    return v === 'done';
  } catch {
    return false;
  }
}

export async function markIntroSlidesCompleted(): Promise<void> {
  await AsyncStorage.setItem(INTRO_SLIDES_KEY, 'done');
}
