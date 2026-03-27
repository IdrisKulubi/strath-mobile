import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const HEARTBEAT_MS = 30_000;

async function sendPresence(isOnline: boolean) {
    const token = await getAuthToken();
    if (!token || !API_URL) {
        return;
    }

    await fetch(`${API_URL}/api/user/presence`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isOnline }),
    }).catch(() => {
        // Non-fatal heartbeat
    });
}

export function usePresenceHeartbeat() {
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        const startHeartbeat = () => {
            sendPresence(true);
            if (!interval) {
                interval = setInterval(() => {
                    sendPresence(true);
                }, HEARTBEAT_MS);
            }
        };

        const stopHeartbeat = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            sendPresence(false);
        };

        startHeartbeat();

        const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                startHeartbeat();
            } else {
                stopHeartbeat();
            }
        });

        return () => {
            subscription.remove();
            stopHeartbeat();
        };
    }, []);
}
