import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface StrengthMeterProps {
    percentage: number; // 0 to 100
    onPress?: () => void;
}

export function StrengthMeter({ percentage, onPress }: StrengthMeterProps) {
    const { colors } = useTheme();

    const getStrengthLabel = (p: number) => {
        if (p < 30) return 'WEAK';
        if (p < 70) return 'GROWING';
        if (p < 100) return 'STRONG';
        return 'MAXIMUM';
    };

    const label = getStrengthLabel(percentage);

    const width = useSharedValue(0);

    React.useEffect(() => {
        width.value = withTiming(percentage, { duration: 1000 });
    }, [percentage]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: `${width.value}%`,
        };
    });

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <View style={[styles.container, { backgroundColor: colors.card }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        Profile Strength: <Text style={styles.strengthText}>{label} ({percentage}%)</Text>
                    </Text>
                </View>
                <View style={[styles.track, { backgroundColor: colors.border }]}>
                    <Animated.View style={[styles.barContainer, animatedStyle]}>
                        <LinearGradient
                            colors={['#00f2ff', '#ff0055']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradient}
                        />
                    </Animated.View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
    },
    strengthText: {
        color: '#00f2ff',
        fontWeight: 'bold',
    },
    track: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    barContainer: {
        height: '100%',
    },
    gradient: {
        flex: 1,
    },
});
