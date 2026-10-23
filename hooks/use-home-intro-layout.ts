import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGlassTabBarHeight } from '@/components/navigation/glass-tab-bar';

const HEADER_HEIGHT = 50;
const TAB_SWITCHER_HEIGHT = 44;
const CAROUSEL_FOOTER = 32;
const SCREEN_PADDING = 4;
const MIN_CARD_HEIGHT = 360;

export function useHomeIntroLayout() {
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const tabBarHeight = getGlassTabBarHeight(insets.bottom);

    return useMemo(() => {
        const cardHeight = Math.max(
            MIN_CARD_HEIGHT,
            windowHeight
                - insets.top
                - HEADER_HEIGHT
                - TAB_SWITCHER_HEIGHT
                - CAROUSEL_FOOTER
                - tabBarHeight
                - SCREEN_PADDING,
        );

        return {
            cardHeight,
            headerCompact: true,
            itemWidthRatio: 0.88,
        };
    }, [insets.top, tabBarHeight, windowHeight]);
}
