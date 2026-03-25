import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export type DecisionSheetType = 'open_to_meet' | 'pass' | 'view_profile' | 'already_responded';

interface DecisionInfoSheetProps {
    visible: boolean;
    type: DecisionSheetType;
    firstName?: string;
    onClose: () => void;
}

const CONTENT: Record<
    DecisionSheetType,
    { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; steps: string[]; primaryColor: string; ctaLabel: string }
> = {
    open_to_meet: {
        icon: 'heart',
        title: 'Interest sent 💜',
        steps: [
            "We only spill if they're open too.",
            "You'll see each other in Dates when you both say yes.",
            "From there — vibe check, chat, or plan to link.",
        ],
        primaryColor: '#e91e8c',
        ctaLabel: 'Got it',
    },
    pass: {
        icon: 'arrow-forward-circle-outline',
        title: 'Removed from today\'s set 👋',
        steps: [
            "They won't know you passed.",
            "New matches tomorrow — same energy.",
            "Explore tab's always there if you want more.",
        ],
        primaryColor: '#64748b',
        ctaLabel: 'Got it',
    },
    view_profile: {
        icon: 'person-outline',
        title: 'Peep their full profile 👀',
        steps: [
            'Photos, interests, vibe — the whole package.',
            'Check compatibility and why you matched.',
            "Tap Open to Meet when you're ready.",
        ],
        primaryColor: '#e91e8c',
        ctaLabel: 'View Profile',
    },
    already_responded: {
        icon: 'checkmark-circle',
        title: "You've already shown interest ✓",
        steps: [
            "We'll let you know if they're open too.",
            "Dates tab when you're both a match.",
            "Ball's in their court — you're good.",
        ],
        primaryColor: '#10b981',
        ctaLabel: 'Got it',
    },
};

export function DecisionInfoSheet({ visible, type, firstName, onClose }: DecisionInfoSheetProps) {
    const { colors, isDark } = useTheme();
    const translateY = useSharedValue(600);
    const backdropOpacity = useSharedValue(0);
    const dragStartY = useSharedValue(0);

    const content = CONTENT[type];
    const displayTitle = firstName
        ? content.title.replace('their', `${firstName}'s`).replace('your', 'your')
        : content.title;

    const closeSheet = useCallback(() => {
        translateY.value = withTiming(600, { duration: 220 });
        backdropOpacity.value = withTiming(0, { duration: 180 });
        setTimeout(onClose, 240);
    }, [onClose, translateY, backdropOpacity]);

    useEffect(() => {
        if (!visible) return;
        translateY.value = 600;
        backdropOpacity.value = 0;
        translateY.value = withSpring(0, { damping: 28, stiffness: 280, mass: 0.7 });
        backdropOpacity.value = withTiming(1, { duration: 220 });
    }, [visible, translateY, backdropOpacity]);

    const panGesture = Gesture.Pan()
        .onBegin(() => {
            dragStartY.value = translateY.value;
        })
        .onUpdate((event) => {
            const next = dragStartY.value + event.translationY;
            translateY.value = Math.max(0, next);
        })
        .onEnd((event) => {
            const shouldClose = translateY.value > 120 || event.velocityY > 800;
            if (shouldClose) {
                runOnJS(closeSheet)();
                return;
            }
            translateY.value = withSpring(0, { damping: 28, stiffness: 280 });
        });

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    if (!visible) return null;

    return (
        <Modal transparent visible animationType="none" onRequestClose={closeSheet}>
            <GestureHandlerRootView style={styles.root}>
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
                </Animated.View>

                <GestureDetector gesture={panGesture}>
                    <Animated.View
                        style={[
                            styles.sheet,
                            sheetStyle,
                            {
                                backgroundColor: isDark ? '#1a1425' : '#ffffff',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                            },
                        ]}
                    >
                        <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />

                        <View style={styles.content}>
                            <View style={[styles.iconWrap, { backgroundColor: content.primaryColor + '20' }]}>
                                <Ionicons name={content.icon} size={36} color={content.primaryColor} />
                            </View>

                            <Text style={[styles.title, { color: colors.foreground }]}>
                                {firstName && type === 'open_to_meet'
                                    ? `Interest sent to ${firstName} 💜`
                                    : firstName && type === 'pass'
                                        ? `${firstName} removed from today's set`
                                        : displayTitle}
                            </Text>

                            <View style={[styles.stepsWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                                {content.steps.map((step, i) => (
                                    <View key={i} style={styles.stepRow}>
                                        <View style={[styles.stepDot, { backgroundColor: content.primaryColor }]} />
                                        <Text style={[styles.stepText, { color: colors.mutedForeground }]}>
                                            {step}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <Pressable
                                onPress={closeSheet}
                                style={[styles.gotItBtn, { backgroundColor: content.primaryColor }]}
                            >
                                <Text style={styles.gotItText}>{content.ctaLabel}</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    content: {
        alignItems: 'center',
        gap: 20,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.3,
        lineHeight: 28,
    },
    stepsWrap: {
        width: '100%',
        borderRadius: 16,
        padding: 18,
        gap: 14,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    stepDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 7,
    },
    stepText: {
        flex: 1,
        fontSize: 15,
        lineHeight: 22,
    },
    gotItBtn: {
        width: '100%',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gotItText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
