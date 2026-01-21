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
    Modal,
    Image,
    ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useCreateEvent } from '@/hooks/use-events';
import { useImageUpload } from '@/hooks/use-image-upload';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    X,
    CalendarBlank,
    MapPin,
    Clock,
    Users,
    Link as LinkIcon,
    Camera,
    Image as ImageIcon,
} from 'phosphor-react-native';
import { EVENT_CATEGORIES, EventCategory, CreateEventData } from '@/types/events';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

interface CreateEventSheetProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CreateEventSheet({ visible, onClose, onSuccess }: CreateEventSheetProps) {
    const { colors, isDark } = useTheme();
    const createEventMutation = useCreateEvent();
    const { uploadImage, isUploading } = useImageUpload();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<EventCategory>('social');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [location, setLocation] = useState('');
    const [isVirtual, setIsVirtual] = useState(false);
    const [virtualLink, setVirtualLink] = useState('');
    const [organizerName, setOrganizerName] = useState('');
    const [maxAttendees, setMaxAttendees] = useState('');
    
    const [startDate, setStartDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const handlePickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photos to add a cover image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            try {
                const uploadedUrl = await uploadImage(result.assets[0].uri);
                setCoverImage(uploadedUrl);
            } catch {
                Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
            }
        }
    };

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
            coverImage: coverImage || undefined,
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
            setCoverImage(null);
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
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View 
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
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Cover Image */}
                        <Animated.View entering={FadeInDown.delay(25)}>
                            <Text style={[styles.label, { color: colors.foreground, marginTop: 0 }]}>
                                Cover Image
                            </Text>
                            <Pressable
                                onPress={handlePickImage}
                                disabled={isUploading}
                                style={[
                                    styles.coverImagePicker,
                                    { 
                                        backgroundColor: colors.muted,
                                        borderColor: colors.border,
                                    },
                                    coverImage && styles.coverImagePickerWithImage,
                                ]}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="large" color={colors.primary} />
                                ) : coverImage ? (
                                    <>
                                        <Image 
                                            source={{ uri: coverImage }} 
                                            style={styles.coverImagePreview} 
                                        />
                                        <View style={styles.coverImageOverlay}>
                                            <Camera size={24} color="#fff" />
                                            <Text style={styles.coverImageChangeText}>Change</Text>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.coverImagePlaceholder}>
                                        <ImageIcon size={32} color={colors.mutedForeground} />
                                        <Text style={[styles.coverImagePlaceholderText, { color: colors.mutedForeground }]}>
                                            Add cover image
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        </Animated.View>

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
                                        borderWidth: 1,
                                    }
                                ]}
                                placeholder="What's happening?"
                                placeholderTextColor={colors.mutedForeground}
                                value={title}
                                onChangeText={setTitle}
                                maxLength={100}
                                autoFocus={false}
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
                </View>
            </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
    },
    keyboardView: {
        justifyContent: 'flex-end',
    },
    sheet: {
        height: '85%',
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
        paddingBottom: 40,
    },
    coverImagePicker: {
        height: 160,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    coverImagePickerWithImage: {
        borderStyle: 'solid',
        borderWidth: 0,
    },
    coverImagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    coverImageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverImageChangeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    coverImagePlaceholder: {
        alignItems: 'center',
        gap: 8,
    },
    coverImagePlaceholderText: {
        fontSize: 14,
        fontWeight: '500',
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
        minHeight: 50,
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
