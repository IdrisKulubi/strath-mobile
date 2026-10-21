import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useHomeExperience } from '@/context/home-experience-context';

const V2_SWIPE_ROUTES = [
    '/(tabs)/profile',
    '/(tabs)/dates',
    '/(tabs)',
    '/(tabs)/pulse',
    '/(tabs)/chats',
] as const;

const V1_SWIPE_ROUTES = [
    '/(tabs)/profile',
    '/(tabs)/dates',
    '/(tabs)',
    '/(tabs)/chats',
] as const;

const MIN_SWIPE_DISTANCE = 36;
const MAX_VERTICAL_DRIFT = 24;

type SwipeRoute = (typeof V2_SWIPE_ROUTES)[number];

export function TabSwipeView({
    route,
    children,
    style,
}: {
    route: SwipeRoute;
    children: React.ReactNode;
    style?: ViewStyle;
}) {
    const router = useRouter();
    const { isV2Enabled } = useHomeExperience();
    const swipeRoutes: readonly SwipeRoute[] = isV2Enabled ? V2_SWIPE_ROUTES : V1_SWIPE_ROUTES;
    const routeIndex = swipeRoutes.indexOf(route);
    const navigateTo = (nextRoute: SwipeRoute) => {
        router.replace(nextRoute as any);
    };

    const panGesture = Gesture.Pan()
        .activeOffsetX([-18, 18])
        .failOffsetY([-14, 14])
        .onEnd((event) => {
            if (Math.abs(event.translationY) > MAX_VERTICAL_DRIFT) {
                return;
            }

            if (event.translationX <= -MIN_SWIPE_DISTANCE && routeIndex < swipeRoutes.length - 1) {
                runOnJS(navigateTo)(swipeRoutes[routeIndex + 1]);
                return;
            }

            if (event.translationX >= MIN_SWIPE_DISTANCE && routeIndex > 0) {
                runOnJS(navigateTo)(swipeRoutes[routeIndex - 1]);
            }
        });

    return (
        <GestureDetector gesture={panGesture}>
            <View style={[styles.container, style]}>{children}</View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
