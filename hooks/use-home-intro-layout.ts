import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT_COMPACT = 64;
const HEADER_HEIGHT_EXPANDED = 92;
const PREFS_HEIGHT_COLLAPSED = 44;
const PREFS_HEIGHT_EXPANDED = 212;
const SECTION_HEADER_COMPACT = 36;
const SECTION_HEADER_EXPANDED = 48;
const CAROUSEL_FOOTER = 44;
const SCREEN_PADDING = 12;
const MIN_CARD_HEIGHT = 360;

export function useHomeIntroLayout(prefsExpanded: boolean, showPrefsPanel: boolean) {
    const { height: windowHeight } = useWindowDimensions();
    const tabBarHeight = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();

    return useMemo(() => {
        const headerHeight = prefsExpanded ? HEADER_HEIGHT_EXPANDED : HEADER_HEIGHT_COMPACT;
        const prefsHeight = showPrefsPanel
            ? prefsExpanded
                ? PREFS_HEIGHT_EXPANDED
                : PREFS_HEIGHT_COLLAPSED
            : 0;
        const sectionHeaderHeight = prefsExpanded ? SECTION_HEADER_EXPANDED : SECTION_HEADER_COMPACT;

        const cardHeight = Math.max(
            MIN_CARD_HEIGHT,
            windowHeight
                - insets.top
                - headerHeight
                - prefsHeight
                - sectionHeaderHeight
                - CAROUSEL_FOOTER
                - tabBarHeight
                - SCREEN_PADDING,
        );

        return {
            cardHeight,
            headerCompact: !prefsExpanded,
            itemWidthRatio: prefsExpanded ? 0.82 : 0.88,
        };
    }, [insets.top, prefsExpanded, showPrefsPanel, tabBarHeight, windowHeight]);
}
