import React from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import * as Haptics from 'expo-haptics';
import {
    MusicNotes,
    Briefcase,
    Coffee,
    GameController,
    Moon,
    UsersThree,
    Sparkle
} from 'phosphor-react-native';

export type VibeType = 'all' | 'music' | 'hustle' | 'chill' | 'gaming' | 'night' | 'creative';

interface Vibe {
    id: VibeType;
    label: string;
    icon: React.ElementType;
    color: string;
}

const VIBES: Vibe[] = [
    { id: 'all', label: 'All', icon: Sparkle, color: '#e91e8c' },
    { id: 'music', label: 'Music', icon: MusicNotes, color: '#007AFF' },
    { id: 'hustle', label: 'Hustle', icon: Briefcase, color: '#34C759' },
    { id: 'chill', label: 'Chill', icon: Coffee, color: '#FF9500' },
    { id: 'gaming', label: 'Gaming', icon: GameController, color: '#5856D6' },
    { id: 'night', label: 'Late Night', icon: Moon, color: '#AF52DE' },
    { id: 'creative', label: 'Creative', icon: UsersThree, color: '#FF2D55' },
];

interface VibeSwitcherProps {
    activeVibe: VibeType;
    onVibeChange: (vibe: VibeType) => void;
}

export function VibeSwitcher({ activeVibe, onVibeChange }: VibeSwitcherProps) {
    const { colors } = useTheme();

    const handlePress = (id: VibeType) => {
        if (activeVibe !== id) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onVibeChange(id);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {VIBES.map((vibe) => {
                    const isActive = activeVibe === vibe.id;
                    const Icon = vibe.icon;

                    return (
                        <Pressable
                            key={vibe.id}
                            onPress={() => handlePress(vibe.id)}
                            style={[
                                styles.vibeChip,
                                {
                                    backgroundColor: isActive ? colors.primary : colors.card,
                                    borderColor: isActive ? colors.primary : colors.border,
                                }
                            ]}
                        >
                            <Icon
                                size={18}
                                color={isActive ? '#FFFFFF' : colors.mutedForeground}
                                weight={isActive ? 'bold' : 'regular'}
                            />
                            <Text
                                style={[
                                    styles.vibeLabel,
                                    {
                                        color: isActive ? '#FFFFFF' : colors.mutedForeground,
                                        fontWeight: isActive ? '700' : '500'
                                    }
                                ]}
                            >
                                {vibe.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 60,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8,
    },
    vibeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
        // iOS shadow for premium feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    vibeLabel: {
        fontSize: 14,
    },
});
