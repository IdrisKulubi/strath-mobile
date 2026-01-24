import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    FadeIn,
    FadeInDown,
    SlideInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Calendar, User, MagnifyingGlass, CheckCircle } from 'phosphor-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Phone } from 'phosphor-react-native';

interface TheEssentialsProps {
    data: {
        firstName: string;
        lastName: string;
        phoneNumber: string;
        age: number;
        zodiacSign: string;
        gender: string;
        lookingFor: string;
    };
    onUpdate: (data: Partial<TheEssentialsProps['data']>) => void;
    onNext: () => void;
}

// Calculate zodiac sign from birthday
const getZodiacSign = (month: number, day: number): string => {
    const signs = [
        { name: 'Capricorn', emoji: '♑', start: [12, 22], end: [1, 19] },
        { name: 'Aquarius', emoji: '♒', start: [1, 20], end: [2, 18] },
        { name: 'Pisces', emoji: '♓', start: [2, 19], end: [3, 20] },
        { name: 'Aries', emoji: '♈', start: [3, 21], end: [4, 19] },
        { name: 'Taurus', emoji: '♉', start: [4, 20], end: [5, 20] },
        { name: 'Gemini', emoji: '♊', start: [5, 21], end: [6, 20] },
        { name: 'Cancer', emoji: '♋', start: [6, 21], end: [7, 22] },
        { name: 'Leo', emoji: '♌', start: [7, 23], end: [8, 22] },
        { name: 'Virgo', emoji: '♍', start: [8, 23], end: [9, 22] },
        { name: 'Libra', emoji: '♎', start: [9, 23], end: [10, 22] },
        { name: 'Scorpio', emoji: '♏', start: [10, 23], end: [11, 21] },
        { name: 'Sagittarius', emoji: '♐', start: [11, 22], end: [12, 21] },
    ];

    for (const sign of signs) {
        if (
            (month === sign.start[0] && day >= sign.start[1]) ||
            (month === sign.end[0] && day <= sign.end[1])
        ) {
            return sign.name;
        }
    }
    return 'Capricorn';
};

const calculateAge = (birthday: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const m = today.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
        age--;
    }
    return age;
};

const getZodiacEmoji = (sign: string): string => {
    const emojis: Record<string, string> = {
        'Aries': '♈', 'Taurus': '♉', 'Gemini': '♊', 'Cancer': '♋',
        'Leo': '♌', 'Virgo': '♍', 'Libra': '♎', 'Scorpio': '♏',
        'Sagittarius': '♐', 'Capricorn': '♑', 'Aquarius': '♒', 'Pisces': '♓',
    };
    return emojis[sign] || '✨';
};

// Chip selector component
const ChipSelector = ({
    options,
    selected,
    onSelect,
    multiSelect = false,
}: {
    options: { value: string; label: string; emoji?: string }[];
    selected: string | string[];
    onSelect: (value: string) => void;
    multiSelect?: boolean;
}) => {
    return (
        <View style={styles.chipContainer}>
            {options.map((option, index) => {
                const isSelected = multiSelect
                    ? (selected as string[]).includes(option.value)
                    : selected === option.value;

                return (
                    <Animated.View
                        key={option.value}
                        entering={FadeInDown.delay(index * 50).springify()}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onSelect(option.value);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.chip, isSelected && styles.chipSelected]}>
                                {option.emoji && (
                                    <Text style={styles.chipEmoji}>{option.emoji}</Text>
                                )}
                                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                    {option.label}
                                </Text>
                                {isSelected && (
                                    <CheckCircle size={16} color="#fff" weight="fill" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                );
            })}
        </View>
    );
};

export function TheEssentials({ data, onUpdate, onNext }: TheEssentialsProps) {
    const [step, setStep] = useState(0); // 0: name, 1: phone, 2: birthday, 3: gender, 4: looking for
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [birthday, setBirthday] = useState<Date | null>(null);
    const [firstName, setFirstName] = useState(data.firstName || '');
    const [lastName, setLastName] = useState(data.lastName || '');
    const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber || '');

    const progressWidth = useSharedValue(0);

    useEffect(() => {
        progressWidth.value = withSpring(((step + 1) / 5) * 100, { damping: 15 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const handleNameContinue = () => {
        if (firstName.trim() && lastName.trim()) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onUpdate({ firstName: firstName.trim(), lastName: lastName.trim() });
            setStep(1);
        }
    };

    // Format phone number for display (Kenyan format)
    const formatPhoneNumber = (text: string) => {
        // Remove all non-digits
        const digits = text.replace(/\D/g, '');
        
        // Limit to 12 digits (including country code)
        const limited = digits.slice(0, 12);
        
        // Format based on length
        if (limited.startsWith('254')) {
            // Already has country code
            if (limited.length <= 3) return `+${limited}`;
            if (limited.length <= 6) return `+${limited.slice(0, 3)} ${limited.slice(3)}`;
            return `+${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
        } else if (limited.startsWith('0')) {
            // Local format starting with 0
            if (limited.length <= 4) return limited;
            if (limited.length <= 7) return `${limited.slice(0, 4)} ${limited.slice(4)}`;
            return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7)}`;
        } else {
            // Just digits
            return limited;
        }
    };

    const handlePhoneChange = (text: string) => {
        const formatted = formatPhoneNumber(text);
        setPhoneNumber(formatted);
    };

    const isPhoneValid = () => {
        const digits = phoneNumber.replace(/\D/g, '');
        // Valid if it's 10 digits (local) or 12 digits (with country code)
        return digits.length === 10 || digits.length === 12;
    };

    const handlePhoneContinue = () => {
        if (isPhoneValid()) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Store in standardized format with country code
            const digits = phoneNumber.replace(/\D/g, '');
            const standardized = digits.startsWith('254') ? `+${digits}` : `+254${digits.slice(1)}`;
            onUpdate({ phoneNumber: standardized });
            setStep(2);
        }
    };

    const handleBirthdayChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setBirthday(selectedDate);
            const age = calculateAge(selectedDate);
            const zodiac = getZodiacSign(
                selectedDate.getMonth() + 1,
                selectedDate.getDate()
            );
            onUpdate({ age, zodiacSign: zodiac });
        }
    };

    const handleBirthdayContinue = () => {
        if (birthday && data.age >= 18) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setStep(3);
        }
    };

    const handleGenderSelect = (gender: string) => {
        onUpdate({ gender });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => setStep(4), 300);
    };

    const handleLookingForSelect = (lookingFor: string) => {
        onUpdate({ lookingFor });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(onNext, 500);
    };

    const genderOptions = [
        { value: 'male', label: 'Man', emoji: '👨' },
        { value: 'female', label: 'Woman', emoji: '👩' },
        { value: 'other', label: 'Other', emoji: '✨' },
    ];

    const lookingForOptions = [
        { value: 'women', label: 'Women', emoji: '👩' },
        { value: 'men', label: 'Men', emoji: '👨' },
        { value: 'everyone', label: 'Everyone', emoji: '💕' },
    ];

    const isNameValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;
    const isBirthdayValid = birthday && data.age >= 18;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient
                colors={['#0f0d23', '#1a0d2e', '#0f0d23']}
                style={StyleSheet.absoluteFill}
            />

            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBg}>
                    <Animated.View style={[styles.progressBarFill, progressStyle]}>
                        <LinearGradient
                            colors={['#ec4899', '#f43f5e']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Step 0: Name */}
                {step === 0 && (
                    <Animated.View entering={SlideInRight.springify()} style={styles.stepContainer}>
                        <View style={styles.iconContainer}>
                            <User size={32} color="#ec4899" weight="fill" />
                        </View>
                        <Text style={styles.stepTitle}>{"What's your name?"}</Text>
                        <Text style={styles.stepSubtitle}>
                            {"This is how you'll appear to others"}
                        </Text>

                        <View style={styles.inputGroup}>
                            <TextInput
                                style={styles.input}
                                placeholder="First name"
                                placeholderTextColor="#64748b"
                                value={firstName}
                                onChangeText={setFirstName}
                                autoFocus
                                autoCapitalize="words"
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Last name"
                                placeholderTextColor="#64748b"
                                value={lastName}
                                onChangeText={setLastName}
                                autoCapitalize="words"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleNameContinue}
                            disabled={!isNameValid}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={isNameValid ? ['#ec4899', '#f43f5e'] : ['#374151', '#374151']}
                                style={styles.continueButton}
                            >
                                <Text style={[styles.continueButtonText, !isNameValid && styles.disabledText]}>
                                    Continue
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Step 1: Phone Number */}
                {step === 1 && (
                    <Animated.View entering={SlideInRight.springify()} style={styles.stepContainer}>
                        <View style={styles.iconContainer}>
                            <Phone size={32} color="#ec4899" weight="fill" />
                        </View>
                        <Text style={styles.stepTitle}>{"What's your number?"}</Text>
                        <Text style={styles.stepSubtitle}>
                            {"We'll use this to help you connect with matches"}
                        </Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="+254 7XX XXX XXX"
                                placeholderTextColor="#64748b"
                                value={phoneNumber}
                                onChangeText={handlePhoneChange}
                                keyboardType="phone-pad"
                                autoFocus
                            />
                        </View>

                        <Text style={[styles.phoneHint, { color: '#64748b' }]}>
                            Enter your Kenyan phone number
                        </Text>

                        <TouchableOpacity
                            onPress={handlePhoneContinue}
                            disabled={!isPhoneValid()}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={isPhoneValid() ? ['#ec4899', '#f43f5e'] : ['#374151', '#374151']}
                                style={styles.continueButton}
                            >
                                <Text style={[styles.continueButtonText, !isPhoneValid() && styles.disabledText]}>
                                    Continue
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Step 2: Birthday */}
                {step === 2 && (
                    <Animated.View entering={SlideInRight.springify()} style={styles.stepContainer}>
                        <View style={styles.iconContainer}>
                            <Calendar size={32} color="#ec4899" weight="fill" />
                        </View>
                        <Text style={styles.stepTitle}>{"When's your birthday?"}</Text>
                        <Text style={styles.stepSubtitle}>
                            {"We'll use this to verify your age & find your zodiac"}
                        </Text>

                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            style={styles.dateButton}
                        >
                            <Text style={styles.dateButtonText}>
                                {birthday
                                    ? birthday.toLocaleDateString('en-US', {
                                          month: 'long',
                                          day: 'numeric',
                                          year: 'numeric',
                                      })
                                    : 'Tap to select your birthday'}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={birthday || new Date(2000, 0, 1)}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleBirthdayChange}
                                maximumDate={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate())}
                                minimumDate={new Date(1950, 0, 1)}
                                themeVariant="dark"
                            />
                        )}

                        {birthday && data.age && (
                            <Animated.View entering={FadeIn} style={styles.zodiacReveal}>
                                <Text style={styles.zodiacEmoji}>{getZodiacEmoji(data.zodiacSign)}</Text>
                                <Text style={styles.zodiacText}>
                                    {`You're ${data.age} years old and a ${data.zodiacSign}!`}
                                </Text>
                            </Animated.View>
                        )}

                        {birthday && data.age && data.age < 18 && (
                            <Animated.View entering={FadeIn} style={styles.errorBanner}>
                                <Text style={styles.errorText}>
                                    You must be 18+ to use Strathspace
                                </Text>
                            </Animated.View>
                        )}

                        <TouchableOpacity
                            onPress={handleBirthdayContinue}
                            disabled={!isBirthdayValid}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={isBirthdayValid ? ['#ec4899', '#f43f5e'] : ['#374151', '#374151']}
                                style={styles.continueButton}
                            >
                                <Text style={[styles.continueButtonText, !isBirthdayValid && styles.disabledText]}>
                                    Continue
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Step 3: Gender */}
                {step === 3 && (
                    <Animated.View entering={SlideInRight.springify()} style={styles.stepContainer}>
                        <View style={styles.iconContainer}>
                            <User size={32} color="#ec4899" weight="fill" />
                        </View>
                        <Text style={styles.stepTitle}>I am a...</Text>
                        <Text style={styles.stepSubtitle}>
                            Select what best describes you
                        </Text>

                        <ChipSelector
                            options={genderOptions}
                            selected={data.gender}
                            onSelect={handleGenderSelect}
                        />
                    </Animated.View>
                )}

                {/* Step 4: Looking For */}
                {step === 4 && (
                    <Animated.View entering={SlideInRight.springify()} style={styles.stepContainer}>
                        <View style={styles.iconContainer}>
                            <MagnifyingGlass size={32} color="#ec4899" weight="fill" />
                        </View>
                        <Text style={styles.stepTitle}>{"I'm interested in..."}</Text>
                        <Text style={styles.stepSubtitle}>
                            Who would you like to meet?
                        </Text>

                        <ChipSelector
                            options={lookingForOptions}
                            selected={data.lookingFor}
                            onSelect={handleLookingForSelect}
                        />
                    </Animated.View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    progressBarContainer: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 16,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    stepContainer: {
        flex: 1,
        paddingTop: 40,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 32,
        lineHeight: 24,
    },
    inputGroup: {
        gap: 16,
        marginBottom: 32,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        fontSize: 18,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    continueButton: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
    },
    continueButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    disabledText: {
        color: '#6b7280',
    },
    dateButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 24,
    },
    dateButtonText: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
    },
    zodiacReveal: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    zodiacEmoji: {
        fontSize: 32,
    },
    zodiacText: {
        fontSize: 16,
        color: '#f472b6',
        fontWeight: '600',
    },
    phoneHint: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: -8,
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 16,
    },
    errorBanner: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    errorText: {
        color: '#f87171',
        fontSize: 14,
        textAlign: 'center',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    chipSelected: {
        backgroundColor: 'rgba(236, 72, 153, 0.2)',
        borderColor: '#ec4899',
    },
    chipEmoji: {
        fontSize: 20,
    },
    chipText: {
        fontSize: 16,
        color: '#94a3b8',
        fontWeight: '600',
    },
    chipTextSelected: {
        color: '#fff',
    },
});
