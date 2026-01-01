import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Sparkle, Flame, UsersThree } from 'phosphor-react-native';
import { authClient } from '@/lib/auth-client';

interface PulseEvent {
    id: string;
    type: 'match' | 'activity' | 'vibe';
    message: string;
    timestamp: number;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function PulseBar() {
    const { colors } = useTheme();
    const [events, setEvents] = useState<PulseEvent[]>([]);
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        let eventSource: any;

        const setupSSE = async () => {
            const session = await authClient.getSession();
            const token = session.data?.session?.token;

            if (!token) return;

            // In a real Expo environment, you might need a polyfill for EventSource
            // or use a custom implementation for SSE on mobile.
            // For this implementation, we'll simulate the connection or use a standard one.

            const url = `${API_URL}/api/pulse`;

            try {
                // Simple manual fetch loop if EventSource isn't available/stable in dev
                const connect = async () => {
                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'text/event-stream',
                        },
                    });

                    const reader = response.body?.getReader();
                    if (!reader) return;

                    const decoder = new TextDecoder();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n\n');

                        lines.forEach(line => {
                            if (line.startsWith('data: ')) {
                                const data = JSON.parse(line.replace('data: ', ''));
                                setEvents(prev => {
                                    const exists = prev.find(e => e.id === data.id);
                                    if (exists) return prev;
                                    return [data, ...prev].slice(0, 5);
                                });
                            }
                        });
                    }
                };

                connect();
            } catch (err) {
                console.error("PulseBar SSE connection failed:", err);
            }
        };

        setupSSE();

        return () => {
            // Cleanup
        };
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'match': return <Flame size={16} color="#e91e8c" weight="fill" />;
            case 'vibe': return <Sparkle size={16} color="#007AFF" weight="fill" />;
            default: return <UsersThree size={16} color={colors.primary} weight="bold" />;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.liveBadge}>
                    <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.liveText, { color: colors.primary }]}>PULSE</Text>
                </View>

                {events.length === 0 ? (
                    <Text style={[styles.eventText, { color: colors.mutedForeground, fontStyle: 'italic', opacity: 0.7 }]}>
                        Scanning campus energy...
                    </Text>
                ) : (
                    events.map((event) => (
                        <View key={event.id} style={styles.eventItem}>
                            {getIcon(event.type)}
                            <Text style={[styles.eventText, { color: colors.foreground }]}>
                                {event.message}
                            </Text>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 44,
        width: '100%',
        borderBottomWidth: 1,
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 20,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginRight: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    liveText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    eventItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    eventText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
