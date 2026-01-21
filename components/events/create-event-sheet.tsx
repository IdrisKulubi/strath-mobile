import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useCreateEvent } from '@/hooks/use-events';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    X,
    CalendarBlank,
    MapPin,
    Clock,
    Users,
    Link as LinkIcon,
} from 'phosphor-react-native';
import { EVENT_CATEGORIES, EventCategory, CreateEventData } from '@/types/events';
import * as Haptics from 'expo-haptics';

interface CreateEventSheetProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CreateEventSheet({ visible, onClose, onSuccess }: CreateEventSheetProps) {
    const { colors, isDark } = useTheme();
    const createEventMutation = useCreateEvent();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<EventCategory>('social');
    const [location, setLocation] = useState('');
    const [isVirtual, setIsVirtual] = useState(false);
    const [virtualLink, setVirtualLink] = useState('');
    const [organizerName, setOrganizerName] = useState('');
    const [maxAttendees, setMaxAttendees] = useState('');
    
    const [startDate, setStartDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    if (!visible) return null;

    const handleCreate = async () => {
        if (!title.trim()) {
            Alert.alert('Missing Title', 'Please enter an event title');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const eventData: CreateEventData = {
            title: title.trim(),
            description: description.trim() || undefined,
            category,
            location: location.trim() || undefined,
            isVirtual,
            virtualLink: isVirtual ? virtualLink.trim() : undefined,
            startTime: startDate.toISOString(),
            organizerName: organizerName.trim() || undefined,
            maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
        };

        try {
            await createEventMutation.mutateAsync(eventData);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Reset form
            setTitle('');
            setDescription('');
            setCategory('social');
            setLocation('');
            setIsVirtual(false);
            setVirtualLink('');
            setOrganizerName('');
            setMaxAttendees('');
            setStartDate(new Date());
            
            onSuccess?.();
            onClose();
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to create event. Please try again.');
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const newDate = new Date(startDate);
            newDate.setFullYear(selectedDate.getFullYear());
            newDate.setMonth(selectedDate.getMonth());
            newDate.setDate(selectedDate.getDate());
            setStartDate(newDate);
        }
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime) {
            const newDate = new Date(startDate);
            newDate.setHours(selectedTime.getHours());
            newDate.setMinutes(selectedTime.getMinutes());
            setStartDate(newDate);
        }
    };

    return (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <Animated.View 
                    entering={FadeIn}
                    style={[
                        styles.sheet,
                        { backgroundColor: isDark ? colors.card : '#fff' }
                    ]}
                >
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={colors.foreground} />
                        </Pressable>
                        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                            Create Event
                        </Text>
                        <Pressable
                            onPress={handleCreate}
                            disabled={createEventMutation.isPending}
                            style={[
                                styles.createButton,
                                { backgroundColor: colors.primary },
                                createEventMutation.isPending && { opacity: 0.5 },
                            ]}
                        >
                            <Text style={styles.createButtonText}>
                                {createEventMutation.isPending ? 'Creating...' : 'Create'}
                            </Text>
                        </Pressable>
                    </View>

                    <ScrollView 
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Title */}
                        <Animated.View entering={FadeInDown.delay(50)}>
                            <Text style={[styles.label, { color: colors.foreground }]}>
                                Event Title *
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.titleInput,
                                    { 
                                        backgroundColor: colors.muted,
                                        color: colors.foreground,
                                        borderColor: colors.border,
                                    }
                                ]}
                                placeholder="What's happening?"
                                placeholderTextColor={colors.mutedForeground}
                                value={title}
                                onChangeText={setTitle}
                                maxLength={100}
                            />
                        </Animated.View>

                        {/* Category */}
                        <Animated.View entering={FadeInDown.delay(100)}>
                            <Text style={[styles.label, { color: colors.foreground }]}>
                                Category
                            </Text>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categoriesContainer}
                            >
                                {EVENT_CATEGORIES.map((cat) => (
                                    <Pressable
                                        key={cat.value}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setCategory(cat.value);
                                        }}
                                        style={[
                                            styles.categoryChip,
                                            {
                                                backgroundColor: category === cat.value 
                                                    ? cat.color 
                                                    : colors.muted,
                                                borderColor: category === cat.value 
                                                    ? cat.color 
                                                    : colors.border,
                                            },
                                        ]}
                                    >
                                        <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                                        <Text style={[
                                            styles.categoryText,
                                            { color: category === cat.value ? '#fff' : colors.foreground }
                                        ]}>
                                            {cat.label.split(' ')[0]}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </Animated.View>

                        {/* Date & Time */}
                        <Animated.View entering={FadeInDown.delay(150)} style={styles.row}>
                            <Pressable
                                onPress={() => setShowDatePicker(true)}
                                style={[styles.dateTimeButton, { backgroundColor: colors.muted }]}
                            >
                                <CalendarBlank size={20} color={colors.primary} />
                                <Text style={[styles.dateTimeText, { color: colors.foreground }]}>
                                    {startDate.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => setShowTimePicker(true)}
                                style={[styles.dateTimeButton, { backgroundColor: colors.muted }]}
                            >
                                <Clock size={20} color={colors.primary} />
                                <Text style={[styles.dateTimeText, { color: colors.foreground }]}>
                                    {startDate.toLocaleTimeString('en-US', { 
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </Pressable>
                        </Animated.View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                display="spinner"
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                            />
                        )}

                        {showTimePicker && (
                            <DateTimePicker
                                value={startDate}
                                mode="time"
                                display="spinner"
                                onChange={handleTimeChange}
                            />
                        )}

                        {/* Location */}
                        <Animated.View entering={FadeInDown.delay(200)}>
                            <Text style={[styles.label, { color: colors.foreground }]}>
                                Location
                            </Text>
                            <View style={[styles.inputWithIcon, { backgroundColor: colors.muted }]}>
                                <MapPin size={20} color={colors.mutedForeground} />
                                <TextInput
                                    style={[styles.inputInner, { color: colors.foreground }]}
                                    placeholder="Where is it?"
                                    placeholderTextColor={colors.mutedForeground}
                                    value={location}
                                    onChangeText={setLocation}
                                />
                            </View>
                        </Animated.View>

                        {/* Virtual Toggle */}
                        <Animated.View entering={FadeInDown.delay(250)}>
                            <Pressable
                                onPress={() => setIsVirtual(!isVirtual)}
                                style={[styles.toggleRow, { backgroundColor: colors.muted }]}
                            >
                                <LinkIcon size={20} color={colors.primary} />
                                <Text style={[styles.toggleText, { color: colors.foreground }]}>
                                    Virtual Event
                                </Text>
                                <View style={[
                                    styles.toggle,
                                    { backgroundColor: isVirtual ? colors.primary : colors.border }
                                ]}>
                                    <View style={[
                                        styles.toggleKnob,
                                        { transform: [{ translateX: isVirtual ? 20 : 0 }] }
                                    ]} />
                                </View>
                            </Pressable>

                            {isVirtual && (
                                <View style={[styles.inputWithIcon, { backgroundColor: colors.muted, marginTop: 8 }]}>
                                    <LinkIcon size={20} color={colors.mutedForeground} />
                                    <TextInput
                                        style={[styles.inputInner, { color: colors.foreground }]}
                                        placeholder="Meeting link (Zoom, Meet, etc.)"
                                        placeholderTextColor={colors.mutedForeground}
                                        value={virtualLink}
                                        onChangeText={setVirtualLink}
                                        autoCapitalize="none"
                                        keyboardType="url"
                                    />
                                </View>
                            )}
                        </Animated.View>

                        {/* Description */}
                        <Animated.View entering={FadeInDown.delay(300)}>
                            <Text style={[styles.label, { color: colors.foreground }]}>
                                Description
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.textArea,
                                    { 
                                        backgroundColor: colors.muted,
                                        color: colors.foreground,
                                    }
                                ]}
                                placeholder="Tell people what this event is about..."
                                placeholderTextColor={colors.mutedForeground}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </Animated.View>

                        {/* Organizer Name */}
                        <Animated.View entering={FadeInDown.delay(350)}>
                            <Text style={[styles.label, { color: colors.foreground }]}>
                                Organizer Name (optional)
                            </Text>
                            <View style={[styles.inputWithIcon, { backgroundColor: colors.muted }]}>
                                <Users size={20} color={colors.mutedForeground} />
                                <TextInput
                                    style={[styles.inputInner, { color: colors.foreground }]}
                                    placeholder="e.g., Tech Club, Your Name"
                                    placeholderTextColor={colors.mutedForeground}
                                    value={organizerName}
                                    onChangeText={setOrganizerName}
                                />
                            </View>
                        </Animated.View>

                        {/* Max Attendees */}
                        <Animated.View entering={FadeInDown.delay(400)}>
                            <Text style={[styles.label, { color: colors.foreground }]}>
                                Max Attendees (optional)
                            </Text>
                            <View style={[styles.inputWithIcon, { backgroundColor: colors.muted }]}>
                                <Users size={20} color={colors.mutedForeground} />
                                <TextInput
                                    style={[styles.inputInner, { color: colors.foreground }]}
                                    placeholder="Leave empty for unlimited"
                                    placeholderTextColor={colors.mutedForeground}
                                    value={maxAttendees}
                                    onChangeText={setMaxAttendees}
                                    keyboardType="numeric"
                                />
                            </View>
                        </Animated.View>

                        {/* Spacer */}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        maxHeight: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    createButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
    },
    titleInput: {
        fontSize: 18,
        fontWeight: '600',
    },
    textArea: {
        minHeight: 100,
        paddingTop: 14,
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        gap: 10,
    },
    inputInner: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
    },
    categoriesContainer: {
        gap: 8,
        paddingVertical: 4,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        gap: 6,
    },
    categoryEmoji: {
        fontSize: 16,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
    },
    dateTimeText: {
        fontSize: 15,
        fontWeight: '500',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginTop: 16,
        gap: 10,
    },
    toggleText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    toggle: {
        width: 48,
        height: 28,
        borderRadius: 14,
        padding: 4,
    },
    toggleKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
    },
});
