import React, { useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    Layout,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    ZoomIn,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Star, X } from 'phosphor-react-native';

import { Text } from '@/components/ui/text';
import { Palette, RADIUS, SPACING } from '@/lib/design-tokens';
import { useOnboardingTheme } from '@/lib/onboarding-theme';


import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingScreenShell } from './onboarding-screen-shell';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 72) / 3;

interface PhotoMomentProps {
    globalStepIndex: number;
    photos: string[];
    onUpdate: (photos: string[]) => void;
    onNext: () => void;
    onBack: () => void;
}

interface PhotoSlot {
    id: number;
    uri: string | null;
}

const DraggablePhoto = ({
    photo,
    index,
    totalPhotos,
    onRemove,
    onMove,
}: {
    photo: PhotoSlot;
    index: number;
    totalPhotos: number;
    onRemove: (id: number) => void;
    onMove: (fromIndex: number, toIndex: number) => void;
}) => {
    const theme = useOnboardingTheme();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const isDragging = useSharedValue(false);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        zIndex: isDragging.value ? 20 : 0,
        elevation: isDragging.value ? 12 : 0,
        shadowOpacity: isDragging.value ? 0.22 : 0,
    }));

    const handleDragStart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

    const handleDrop = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) {
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onMove(fromIndex, toIndex);
    };

    if (!photo.uri) {
        return null;
    }

    const cellSize = PHOTO_SIZE + 12;
    const startColumn = index % 3;
    const startRow = Math.floor(index / 3);

    const dragGesture = Gesture.Pan()
        .activateAfterLongPress(280)
        .onStart(() => {
            isDragging.value = true;
            scale.value = withSpring(1.06);
            runOnJS(handleDragStart)();
        })
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY;
        })
        .onEnd((event) => {
            const targetColumn = Math.max(
                0,
                Math.min(2, Math.round(startColumn + event.translationX / cellSize)),
            );
            const targetRow = Math.max(
                0,
                Math.round(startRow + event.translationY / (PHOTO_SIZE * 1.25 + 12)),
            );
            const targetIndex = Math.min(totalPhotos - 1, targetRow * 3 + targetColumn);

            runOnJS(handleDrop)(index, targetIndex);
        })
        .onFinalize(() => {
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
            scale.value = withSpring(1);
            isDragging.value = false;
        });

    return (
        <GestureDetector gesture={dragGesture}>
            <Animated.View
                entering={ZoomIn.delay(index * 100).springify()}
                layout={Layout.springify()}
                style={[styles.photoSlot, styles.draggablePhoto, animatedStyle]}
            >
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />

                {index === 0 ? (
                    <View style={[styles.mainBadge, { backgroundColor: theme.primary }]}>
                        <Star size={12} color={theme.primaryForeground} weight="fill" />
                        <Text style={[styles.mainBadgeText, { color: theme.primaryForeground }]}>
                            Main
                        </Text>
                    </View>
                ) : null}

                <View style={styles.photoNumber}>
                    <Text style={styles.photoNumberText}>{index + 1}</Text>
                </View>

                <Pressable
                    style={styles.removeButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onRemove(photo.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${index + 1}`}
                    hitSlop={8}
                >
                    <X size={14} color="#fff" weight="bold" />
                </Pressable>
            </Animated.View>
        </GestureDetector>
    );
};

const AddPhotoSlot = ({ onPress, index }: { onPress: () => void; index: number }) => {
    const theme = useOnboardingTheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View entering={FadeInDown.delay(index * 50)} style={animatedStyle}>
            <TouchableOpacity
                style={[
                    styles.addPhotoSlot,
                    {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                    },
                ]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    scale.value = withSpring(0.95, {}, () => {
                        scale.value = withSpring(1);
                    });
                    onPress();
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
            >
                <Plus size={28} color={theme.mutedForeground} weight="bold" />
                <Text style={[styles.addPhotoLabel, { color: theme.mutedForeground }]}>Add</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

export function PhotoMoment({
    globalStepIndex,
    photos,
    onUpdate,
    onNext,
    onBack,
}: PhotoMomentProps) {
    const theme = useOnboardingTheme();
    const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(() =>
        photos.map((uri, index) => ({ id: index, uri })),
    );
    const photoSlotsRef = useRef(photoSlots);
    const nextId = useRef(photos.length);

    const photosWithContent = photoSlots.filter((photo) => photo.uri !== null);
    const hasMinPhotos = photosWithContent.length >= 2;
    const successColor = theme.isDark ? Palette.dark.success : Palette.light.success;

    const commitPhotoSlots = (nextSlots: PhotoSlot[]) => {
        photoSlotsRef.current = nextSlots;
        setPhotoSlots(nextSlots);
        onUpdate(nextSlots.map((photo) => photo.uri!).filter(Boolean));
    };

    const pickImage = async (useCamera: boolean) => {
        try {
            const permission = useCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert(
                    'Permission needed',
                    `We need ${useCamera ? 'camera' : 'photo library'} access to add photos`,
                );
                return;
            }

            const result = useCamera
                ? await ImagePicker.launchCameraAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [4, 5],
                      quality: 0.8,
                  })
                : await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsMultipleSelection: true,
                      selectionLimit: 6 - photosWithContent.length,
                      allowsEditing: false,
                      quality: 0.8,
                  });

            if (!result.canceled && result.assets.length > 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                const newPhotos: PhotoSlot[] = result.assets.map((asset) => ({
                    id: nextId.current++,
                    uri: asset.uri,
                }));

                const existing = photoSlotsRef.current.filter((photo) => photo.uri !== null);
                const combined = [...existing, ...newPhotos].slice(0, 6);
                commitPhotoSlots(combined);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const showImageOptions = () => {
        Alert.alert('Add Photo', 'Choose how to add your photo', [
            { text: 'Take Photo', onPress: () => pickImage(true) },
            { text: 'Choose from Library', onPress: () => pickImage(false) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const removePhoto = (id: number) => {
        const updated = photoSlotsRef.current.filter((photo) => photo.id !== id);
        commitPhotoSlots(updated);
    };

    const reorderPhotos = (fromIndex: number, toIndex: number) => {
        const updated = [...photoSlotsRef.current];
        const [removed] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, removed);
        commitPhotoSlots(updated);
    };

    const emptySlots = 6 - photosWithContent.length;

    return (
        <OnboardingScreenShell
            stepIndex={globalStepIndex}
            onBack={onBack}
            title="Show your best self"
            subtitle="Add at least 2 photos. Photo 1 is your main — long-press and drag to reorder."
            scrollable
            footer={
                <View style={styles.footerBlock}>
                    <Text
                        style={[
                            styles.counterText,
                            { color: hasMinPhotos ? successColor : theme.mutedForeground },
                        ]}
                    >
                        {!hasMinPhotos
                            ? `Add ${2 - photosWithContent.length} more to continue`
                            : `${photosWithContent.length} / 6 photos`}
                    </Text>
                    <OnboardingPrimaryButton
                        label="Continue"
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            onNext();
                        }}
                        disabled={!hasMinPhotos}
                    />
                </View>
            }
        >
            <View style={styles.photoGrid}>
                {photosWithContent.map((photo, index) => (
                    <DraggablePhoto
                        key={photo.id}
                        photo={photo}
                        index={index}
                        totalPhotos={photosWithContent.length}
                        onRemove={removePhoto}
                        onMove={reorderPhotos}
                    />
                ))}

                {Array.from({ length: emptySlots }).map((_, index) => (
                    <AddPhotoSlot
                        key={`empty-${index}`}
                        index={photosWithContent.length + index}
                        onPress={showImageOptions}
                    />
                ))}
            </View>
        </OnboardingScreenShell>
    );
}

const styles = StyleSheet.create({
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    photoSlot: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE * 1.25,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
    },
    draggablePhoto: {
        shadowColor: '#1C1524',
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
    },
    photoImage: {
        width: '100%',
        height: '100%',
        borderRadius: RADIUS.lg,
    },
    mainBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.md,
    },
    mainBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    photoNumber: {
        position: 'absolute',
        top: 8,
        left: 8,
        width: 24,
        height: 24,
        borderRadius: RADIUS.full,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoNumberText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: RADIUS.full,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoSlot: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE * 1.25,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    addPhotoLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    footerBlock: {
        gap: SPACING.tight,
        width: '100%',
    },
    counterText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});
