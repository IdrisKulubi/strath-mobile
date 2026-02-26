import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Alert,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeIn,
    FadeInDown,
    Layout,
    ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
    Plus,
    X,
    Star,
    ArrowsClockwise,
    Sparkle,
    ImageSquare,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 64) / 3;

interface PhotoSlot {
    id: number;
    uri: string | null;
    isMain: boolean;
}

interface PhotosEditorProps {
    profilePhoto: string | null | undefined;
    photos: string[] | null | undefined;
    onUpdateProfilePhoto: (uri: string | null) => void;
    onUpdatePhotos: (photos: string[]) => void;
}

const DraggablePhoto = ({
    photo,
    index,
    onRemove,
    onSelect,
    isSelected,
    selectedIndex,
    colors,
}: {
    photo: PhotoSlot;
    index: number;
    onRemove: (id: number) => void;
    onSelect: (index: number) => void;
    isSelected: boolean;
    selectedIndex: number | null;
    colors: any;
}) => {
    const scale = useSharedValue(1);
    const borderOpacity = useSharedValue(0);

    React.useEffect(() => {
        if (isSelected) {
            scale.value = withSpring(1.05);
            borderOpacity.value = withTiming(1, { duration: 200 });
        } else {
            scale.value = withSpring(1);
            borderOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [isSelected, scale, borderOpacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const borderStyle = useAnimatedStyle(() => ({
        opacity: borderOpacity.value,
    }));

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onSelect(index);
    };

    const handlePress = () => {
        if (selectedIndex !== null && selectedIndex !== index) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSelect(index);
        }
    };

    if (!photo.uri) return null;

    const showSwapIndicator = selectedIndex !== null && selectedIndex !== index;

    return (
        <Animated.View
            entering={ZoomIn.delay(index * 80).springify()}
            layout={Layout.springify()}
            style={[styles.photoSlot, animatedStyle]}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onLongPress={handleLongPress}
                onPress={handlePress}
                delayLongPress={250}
                style={[
                    styles.photoTouchable,
                    { backgroundColor: colors.card, borderColor: colors.border },
                ]}
            >
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />

                {/* Selection border */}
                <Animated.View
                    style={[
                        styles.selectionBorder,
                        borderStyle,
                        { borderColor: colors.primary },
                    ]}
                />

                {/* Swap indicator */}
                {showSwapIndicator && (
                    <View style={[styles.swapIndicator, { backgroundColor: colors.primary }]}>
                        <ArrowsClockwise size={18} color="#fff" weight="bold" />
                    </View>
                )}

                {/* Main photo badge */}
                {photo.isMain && !showSwapIndicator && (
                    <View style={[styles.mainBadge, { backgroundColor: colors.primary }]}>
                        <Star size={10} color="#fff" weight="fill" />
                        <Text style={styles.mainBadgeText}>Main</Text>
                    </View>
                )}

                {/* Photo number */}
                {!showSwapIndicator && (
                    <View style={[styles.photoNumber, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <Text style={styles.photoNumberText}>{index + 1}</Text>
                    </View>
                )}

                {/* Remove button */}
                {!isSelected && !showSwapIndicator && (
                    <TouchableOpacity
                        style={[styles.removeButton, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onRemove(photo.id);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={12} color="#fff" weight="bold" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const AddPhotoSlot = ({
    onPress,
    index,
    colors,
}: {
    onPress: () => void;
    index: number;
    colors: any;
}) => {
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
                        backgroundColor: colors.card,
                        borderColor: colors.border,
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
            >
                <Plus size={24} color={colors.muted} weight="bold" />
                <Text style={[styles.addPhotoText, { color: colors.muted }]}>Add</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

export function PhotosEditor({
    profilePhoto,
    photos,
    onUpdateProfilePhoto,
    onUpdatePhotos,
}: PhotosEditorProps) {
    const { colors, isDark } = useTheme();

    // Combine profilePhoto and photos into slots
    const initialSlots = (): PhotoSlot[] => {
        const slots: PhotoSlot[] = [];
        let id = 0;

        if (profilePhoto) {
            slots.push({ id: id++, uri: profilePhoto, isMain: true });
        }

        if (photos) {
            photos.forEach((uri) => {
                if (uri) {
                    slots.push({ id: id++, uri, isMain: slots.length === 0 });
                }
            });
        }

        return slots;
    };

    const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(initialSlots);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const nextId = useRef(photoSlots.length + 10);

    useEffect(() => {
        const nextSlots = initialSlots();

        setPhotoSlots((prev) => {
            const prevUris = prev.map((slot) => slot.uri).filter(Boolean);
            const nextUris = nextSlots.map((slot) => slot.uri).filter(Boolean);

            const isSame =
                prevUris.length === nextUris.length &&
                prevUris.every((uri, index) => uri === nextUris[index]);

            return isSame ? prev : nextSlots;
        });

        nextId.current = Math.max(nextId.current, nextSlots.length + 10);
        setSelectedIndex(null);
    }, [profilePhoto, photos]);

    const photosWithContent = photoSlots.filter((p) => p.uri !== null);

    // Sync changes back to parent
    const syncToParent = (slots: PhotoSlot[]) => {
        const validPhotos = slots.filter((p) => p.uri !== null);
        if (validPhotos.length > 0) {
            onUpdateProfilePhoto(validPhotos[0].uri);
            onUpdatePhotos(validPhotos.slice(1).map((p) => p.uri!));
        } else {
            onUpdateProfilePhoto(null);
            onUpdatePhotos([]);
        }
    };

    const pickImage = async (useCamera: boolean) => {
        try {
            const permission = useCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert(
                    'Permission needed',
                    `We need ${useCamera ? 'camera' : 'photo library'} access to add photos`
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
                    isMain: photosWithContent.length === 0,
                }));

                setPhotoSlots((prev) => {
                    const existing = prev.filter((p) => p.uri !== null);
                    const combined = [...existing, ...newPhotos].slice(0, 6);
                    // Ensure first is main
                    combined.forEach((p, i) => (p.isMain = i === 0));
                    syncToParent(combined);
                    return combined;
                });
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
        setPhotoSlots((prev) => {
            const updated = prev.filter((p) => p.id !== id);
            // If we removed the main photo, make the first one main
            if (updated.length > 0 && !updated.some((p) => p.isMain)) {
                updated[0].isMain = true;
            }
            syncToParent(updated);
            return updated;
        });
    };

    const reorderPhotos = (fromIndex: number, toIndex: number) => {
        setPhotoSlots((prev) => {
            const updated = [...prev];
            const [removed] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, removed);
            // First photo is always main
            updated.forEach((p, i) => (p.isMain = i === 0));
            syncToParent(updated);
            return updated;
        });
    };

    const handlePhotoSelect = (index: number) => {
        if (selectedIndex === null) {
            setSelectedIndex(index);
        } else if (selectedIndex === index) {
            setSelectedIndex(null);
        } else {
            reorderPhotos(selectedIndex, index);
            setSelectedIndex(null);
        }
    };

    const emptySlots = Math.max(0, 6 - photosWithContent.length);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <ImageSquare size={20} color={colors.primary} weight="fill" />
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        Your Photos
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                        {photosWithContent.length}/6 • Hold to reorder
                    </Text>
                </View>
            </View>

            {/* Photo grid */}
            <View style={styles.photoGrid}>
                {photosWithContent.map((photo, index) => (
                    <DraggablePhoto
                        key={photo.id}
                        photo={photo}
                        index={index}
                        onRemove={removePhoto}
                        onSelect={handlePhotoSelect}
                        isSelected={selectedIndex === index}
                        selectedIndex={selectedIndex}
                        colors={colors}
                    />
                ))}

                {Array.from({ length: emptySlots }).map((_, index) => (
                    <AddPhotoSlot
                        key={`empty-${index}`}
                        index={photosWithContent.length + index}
                        onPress={showImageOptions}
                        colors={colors}
                    />
                ))}
            </View>

            {/* Selection hint */}
            {selectedIndex !== null && (
                <Animated.View
                    entering={FadeIn}
                    style={[styles.selectionHint, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)' }]}
                >
                    <ArrowsClockwise size={16} color={colors.primary} weight="bold" />
                    <Text style={[styles.selectionHintText, { color: colors.primary }]}>
                        Tap another photo to swap
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedIndex(null)}>
                        <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Tips */}
            {selectedIndex === null && (
                <View style={styles.tipsContainer}>
                    <View style={styles.tip}>
                        <Star size={14} color={colors.primary} weight="fill" />
                        <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                            First photo is your main profile pic
                        </Text>
                    </View>
                    <View style={styles.tip}>
                        <Sparkle size={14} color={colors.primary} weight="fill" />
                        <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                            Profiles with 4+ photos get 3x more matches
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 13,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    photoSlot: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
    },
    photoTouchable: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
    },
    photoImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    selectionBorder: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 12,
        borderWidth: 3,
    },
    swapIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(236, 72, 153, 0.8)',
        borderRadius: 12,
    },
    mainBadge: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 3,
    },
    mainBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    photoNumber: {
        position: 'absolute',
        top: 6,
        left: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoNumberText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    removeButton: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoSlot: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    addPhotoText: {
        fontSize: 11,
        fontWeight: '600',
    },
    selectionHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginTop: 12,
        gap: 8,
    },
    selectionHintText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '600',
    },
    tipsContainer: {
        marginTop: 16,
        gap: 8,
    },
    tip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tipText: {
        fontSize: 13,
    },
});
