import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Modal,
    FlatList,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
    Ruler,
    Barbell,
    GraduationCap,
    Cigarette,
    Heart,
    Sparkle,
    Globe,
    Church,
} from 'phosphor-react-native';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const OPTIONS = {
    height: ['4\'11"', '5\'0"', '5\'2"', '5\'4"', '5\'6"', '5\'8"', '5\'10"', '6\'0"', '6\'2"', '6\'4"+'],
    exercise: ['Daily', '4-6 times a week', '2-3 times a week', 'Once a week', 'Rarely', 'Never'],
    education: ['High School', 'Bachelors', 'Masters', 'PhD'],
    smoking: ['Yes', 'No', 'Sometimes'],
    lookingFor: ['Relationship', 'Casual', 'Friends', 'Not sure'],
    politics: ['Liberal', 'Conservative', 'Moderate', 'Prefer not to say'],
    religion: ['Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Agnostic', 'Atheist', 'Other'],
    languages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Swahili'],
};

interface InfoFieldProps {
    label: string;
    value: string | string[];
    icon: React.ReactNode;
    options: string[];
    onSelect: (value: string | string[]) => void;
    isMultiple?: boolean;
    isDark: boolean;
}

function InfoField({
    label,
    value,
    icon,
    options,
    onSelect,
    isMultiple = false,
    isDark,
}: InfoFieldProps) {
    const [showModal, setShowModal] = useState(false);

    const displayValue = Array.isArray(value)
        ? value.length === 0
            ? 'Select...'
            : `${value.length} selected`
        : value || 'Select...';

    const handleSelect = (option: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (isMultiple) {
            const currentArray = Array.isArray(value) ? value : [];
            const newValue = currentArray.includes(option)
                ? currentArray.filter(v => v !== option)
                : [...currentArray, option];
            onSelect(newValue);
        } else {
            onSelect(option);
            setShowModal(false);
        }
    };

    return (
        <View>
            <Pressable
                style={[
                    styles.fieldButton,
                    {
                        backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.04)'
                            : 'rgba(0, 0, 0, 0.03)',
                        borderColor: isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.06)',
                    },
                ]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowModal(true);
                }}
            >
                <View style={styles.fieldLeft}>
                    <View style={styles.iconContainer}>{icon}</View>
                    <View style={styles.fieldTextContainer}>
                        <Text
                            style={[
                                styles.fieldLabel,
                                { color: isDark ? '#94a3b8' : '#6b7280' },
                            ]}
                        >
                            {label}
                        </Text>
                        <Text
                            style={[
                                styles.fieldValue,
                                {
                                    color: isDark ? '#fff' : '#1a1a2e',
                                },
                            ]}
                        >
                            {displayValue}
                        </Text>
                    </View>
                </View>
                <ChevronDown size={20} color={isDark ? '#64748b' : '#9ca3af'} />
            </Pressable>

            {/* Modal */}
            <Modal visible={showModal} transparent animationType="fade">
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowModal(false)}
                >
                    <View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
                            },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <Text
                                style={[
                                    styles.modalTitle,
                                    { color: isDark ? '#fff' : '#1a1a2e' },
                                ]}
                            >
                                {label}
                            </Text>
                        </View>

                        <FlatList
                            data={options}
                            renderItem={({ item }) => {
                                const isSelected = Array.isArray(value)
                                    ? value.includes(item)
                                    : value === item;

                                return (
                                    <Pressable
                                        style={[
                                            styles.optionItem,
                                            {
                                                backgroundColor: isSelected
                                                    ? 'rgba(236, 72, 153, 0.15)'
                                                    : 'transparent',
                                            },
                                        ]}
                                        onPress={() => handleSelect(item)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                {
                                                    color: isSelected
                                                        ? '#ec4899'
                                                        : isDark
                                                        ? '#fff'
                                                        : '#1a1a2e',
                                                },
                                            ]}
                                        >
                                            {item}
                                        </Text>
                                        {isSelected && (
                                            <Text style={styles.optionCheck}>✓</Text>
                                        )}
                                    </Pressable>
                                );
                            }}
                            keyExtractor={(item) => item}
                            scrollEnabled={options.length > 6}
                        />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

interface Phase7KnowMoreProps {
    data: {
        height?: string;
        exercise?: string;
        education?: string;
        smoking?: string;
        lookingFor?: string;
        politics?: string;
        religion?: string;
        languages?: string[];
    };
    onUpdate: (updates: any) => void;
    isDark: boolean;
}

export function Phase7KnowMore({
    data,
    onUpdate,
    isDark,
}: Phase7KnowMoreProps) {
    const { colors } = useTheme();

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View entering={FadeIn}>
                <Text style={[styles.title, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                    Get to know you better
                </Text>
                <Text
                    style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}
                >
                    Fill out what you&rsquo;re comfortable sharing
                </Text>
            </Animated.View>

            {/* Fields */}
            <View style={styles.fieldsContainer}>
                <Animated.View entering={FadeIn.delay(50)}>
                    <InfoField
                        label="Height"
                        value={data.height || ''}
                        icon={<Ruler size={20} color="#ec4899" />}
                        options={OPTIONS.height}
                        onSelect={(value) =>
                            onUpdate({ height: value })
                        }
                        isDark={isDark}
                    />
                </Animated.View>

                <Animated.View entering={FadeIn.delay(100)}>
                    <InfoField
                        label="Exercise Frequency"
                        value={data.exercise || ''}
                        icon={<Barbell size={20} color="#10b981" />}
                        options={OPTIONS.exercise}
                        onSelect={(value) =>
                            onUpdate({ exercise: value })
                        }
                        isDark={isDark}
                    />
                </Animated.View>

                <Animated.View entering={FadeIn.delay(150)}>
                    <InfoField
                        label="Education"
                        value={data.education || ''}
                        icon={<GraduationCap size={20} color="#3b82f6" />}
                        options={OPTIONS.education}
                        onSelect={(value) =>
                            onUpdate({ education: value })
                        }
                        isDark={isDark}
                    />
                </Animated.View>

                <Animated.View entering={FadeIn.delay(200)}>
                    <InfoField
                        label="Smoking"
                        value={data.smoking || ''}
                        icon={<Cigarette size={20} color="#f97316" />}
                        options={OPTIONS.smoking}
                        onSelect={(value) =>
                            onUpdate({ smoking: value })
                        }
                        isDark={isDark}
                    />
                </Animated.View>

                <Animated.View entering={FadeIn.delay(250)}>
                    <InfoField
                        label="Looking For"
                        value={data.lookingFor || ''}
                        icon={<Heart size={20} color="#ef4444" />}
                        options={OPTIONS.lookingFor}
                        onSelect={(value) =>
                            onUpdate({ lookingFor: value })
                        }
                        isDark={isDark}
                    />
                </Animated.View>

                <Animated.View entering={FadeIn.delay(300)}>
                    <InfoField
                        label="Politics"
                        value={data.politics || ''}
                        icon={<Sparkle size={20} color="#8b5cf6" />}
                        options={OPTIONS.politics}
                        onSelect={(value) =>
                            onUpdate({ politics: value })
                        }
                        isDark={isDark}
                    />
                </Animated.View>

                <Animated.View entering={FadeIn.delay(350)}>
                    <InfoField
                        label="Religion"
                        value={data.religion || ''}
                        icon={<Church size={20} color="#06b6d4" />}
                        options={OPTIONS.religion}
                        onSelect={(value) =>
                            onUpdate({ religion: value })
                        }
                        isDark={isDark}
                    />
                </Animated.View>

                <Animated.View entering={FadeIn.delay(400)}>
                    <InfoField
                        label="Languages"
                        value={data.languages || []}
                        icon={<Globe size={20} color="#14b8a6" />}
                        options={OPTIONS.languages}
                        onSelect={(value) =>
                            onUpdate({ languages: value })
                        }
                        isMultiple
                        isDark={isDark}
                    />
                </Animated.View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    contentContainer: {
        paddingVertical: 30,
        paddingBottom: 100,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        lineHeight: 32,
    },
    subtitle: {
        fontSize: 15,
        marginBottom: 28,
        lineHeight: 22,
    },
    fieldsContainer: {
        gap: 12,
    },
    fieldButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    fieldLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(236, 72, 153, 0.08)',
    },
    fieldTextContainer: {
        flex: 1,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    fieldValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        borderRadius: 20,
        maxHeight: '70%',
        width: '100%',
        overflow: 'hidden',
    },
    modalHeader: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    optionText: {
        fontSize: 15,
        fontWeight: '500',
    },
    optionCheck: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ec4899',
    },
});
