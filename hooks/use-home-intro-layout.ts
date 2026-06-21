import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 50;
const TAB_SWITCHER_HEIGHT = 44;
const CAROUSEL_FOOTER = 32;
const SCREEN_PADDING = 4;
const MIN_CARD_HEIGHT = 360;

export function useHomeIntroLayout() {
    const { height: windowHeight } = useWindowDimensions();
    const tabBarHeight = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();

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
