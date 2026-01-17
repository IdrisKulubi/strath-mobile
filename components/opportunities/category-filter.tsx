import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { CATEGORY_CONFIG, type OpportunityCategory, OPPORTUNITY_CATEGORIES } from '@/types/opportunities';
import { useTheme } from '@/hooks/use-theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
    useAnimatedStyle, 
    withSpring,
    useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface CategoryFilterProps {
    selectedCategory: OpportunityCategory | null;
    onSelectCategory: (category: OpportunityCategory | null) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CategoryChip({ 
    category, 
    isSelected, 
    onPress,
    emoji,
    label,
    color,
}: {
    category: OpportunityCategory | null;
    isSelected: boolean;
    onPress: () => void;
    emoji: string;
    label: string;
    color?: string;
}) {
    const { colorScheme } = useTheme();
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        scale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const isDark = colorScheme === 'dark';

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={animatedStyle}
        >
            {isSelected ? (
                <LinearGradient
                    colors={category === null 
                        ? ['#FF6B6B', '#FF8E53'] 
                        : [color || '#8B5CF6', adjustColor(color || '#8B5CF6', 30)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.chipGradient}
                >
                    <Text style={styles.chipEmoji}>{emoji}</Text>
                    <Text style={styles.chipLabelSelected}>{label}</Text>
                </LinearGradient>
            ) : (
                <View style={[
                    styles.chip,
                    { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    }
                ]}>
                    <Text style={styles.chipEmoji}>{emoji}</Text>
                    <Text style={[
                        styles.chipLabel,
                        { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }
                    ]}>
                        {label}
                    </Text>
                </View>
            )}
        </AnimatedPressable>
    );
}

// Helper to lighten/darken a color
function adjustColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
        0x1000000 +
        (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 0 ? 0 : B) : 255)
    ).toString(16).slice(1);
}

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
    const handlePress = (category: OpportunityCategory | null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelectCategory(category);
    };

    return (
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {/* All filter */}
            <CategoryChip
                category={null}
                isSelected={selectedCategory === null}
                onPress={() => handlePress(null)}
                emoji="✨"
                label="All"
            />

            {/* Category filters */}
            {OPPORTUNITY_CATEGORIES.map((category) => {
                const config = CATEGORY_CONFIG[category];
                
                return (
                    <CategoryChip
                        key={category}
                        category={category}
                        isSelected={selectedCategory === category}
                        onPress={() => handlePress(category)}
                        emoji={config.emoji}
                        label={config.label}
                        color={config.color}
                    />
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    chipGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    chipEmoji: {
        fontSize: 14,
    },
    chipLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    chipLabelSelected: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
