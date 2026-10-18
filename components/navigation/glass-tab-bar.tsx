import { Platform } from 'react-native';

/** Matches expo-glass-tabs expanded pill height (EXPANDED_HEIGHT). */
export const GLASS_TAB_BAR_PILL_HEIGHT = 58;

/** Total floating bar footprint: pill + bottom offset used by expo-glass-tabs. */
export function getGlassTabBarHeight(bottomInset = Platform.OS === 'ios' ? 34 : 14): number {
    const bottomOffset = Math.max(bottomInset - 16, 12);
    return GLASS_TAB_BAR_PILL_HEIGHT + bottomOffset;
}
