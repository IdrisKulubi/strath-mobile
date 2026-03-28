import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';

const WAITING_ROOM_PULSE_MS = 4000;

export function useWaitingRoomHaptics(enabled: boolean) {
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            appStateRef.current = nextState;
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        intervalRef.current = setInterval(() => {
            if (appStateRef.current !== 'active') {
                return;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, WAITING_ROOM_PULSE_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled]);
}
