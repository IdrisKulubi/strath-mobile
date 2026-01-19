import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Alert,
    ScrollView,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeIn,
    FadeInDown,
    Layout,
    SlideInRight,
    ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
    Camera,
    Plus,
    X,
    Star,
    ArrowsClockwise,
    Sparkle,
} from 'phosphor-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 72) / 3;

interface PhotoMomentProps {
    photos: string[];
    onUpdate: (photos: string[]) => void;
    onNext: () => void;
}

interface PhotoSlot {
    id: number;
    uri: string | null;
    isMain: boolean;
}

const DraggablePhoto = ({
    photo,
    index,
    onRemove,
    onSelect,
    isSelected,
    selectedIndex,
    totalPhotos,
}: {
    photo: PhotoSlot;
    index: number;
    onRemove: (id: number) => void;
    onSelect: (index: number) => void;
    isSelected: boolean;
    selectedIndex: number | null;
    totalPhotos: number;
}) => {
    const scale = useSharedValue(1);
    const borderOpacity = useSharedValue(0);

    // Update border animation when selected state changes
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
        // If another photo is selected, this is the swap target
        if (selectedIndex !== null && selectedIndex !== index) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSelect(index); // This triggers the swap in parent
        }
    };

    if (!photo.uri) return null;

    // Show "tap to swap" indicator when another photo is selected
    const showSwapIndicator = selectedIndex !== null && selectedIndex !== index;

    return (
        <Animated.View
            entering={ZoomIn.delay(index * 100).springify()}
            layout={Layout.springify()}
            style={[styles.photoSlot, animatedStyle]}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onLongPress={handleLongPress}
                onPress={handlePress}
                delayLongPress={300}
            >
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                
                {/* Selection border */}
                <Animated.View style={[styles.selectionBorder, borderStyle]} />
                
                {/* Swap indicator */}
                {showSwapIndicator && (
                    <View style={styles.swapIndicator}>
                        <ArrowsClockwise size={20} color="#fff" weight="bold" />
                    </View>
                )}
                
                {/* Main photo badge */}
                {photo.isMain && !showSwapIndicator && (
                    <View style={styles.mainBadge}>
                        <Star size={12} color="#fff" weight="fill" />
                        <Text style={styles.mainBadgeText}>Main</Text>
                    </View>
                )}

                {/* Photo number */}
                {!showSwapIndicator && (
                    <View style={styles.photoNumber}>
                        <Text style={styles.photoNumberText}>{index + 1}</Text>
                    </View>
                )}

                {/* Remove button */}
                {!isSelected && !showSwapIndicator && (
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onRemove(photo.id);
                        }}
                    >
                        <X size={14} color="#fff" weight="bold" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const AddPhotoSlot = ({ onPress, index }: { onPress: () => void; index: number }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 50)}
            style={animatedStyle}
        >
            <TouchableOpacity
                style={styles.addPhotoSlot}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    scale.value = withSpring(0.95, {}, () => {
                        scale.value = withSpring(1);
                    });
                    onPress();
                }}
                activeOpacity={0.7}
            >
                <Plus size={28} color="#64748b" weight="bold" />
            </TouchableOpacity>
        </Animated.View>
    );
};

export function PhotoMoment({ photos, onUpdate, onNext }: PhotoMomentProps) {
    const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(() =>
        photos.map((uri, index) => ({ id: index, uri, isMain: index === 0 }))
    );
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const nextId = useRef(photos.length);

    const photosWithContent = photoSlots.filter((p) => p.uri !== null);
    const hasMinPhotos = photosWithContent.length >= 2;

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
                    // Update parent
                    onUpdate(combined.map((p) => p.uri!));
                    return combined;
                });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const showImageOptions = () => {
        Alert.alert(
            'Add Photo',
            'Choose how to add your photo',
            [
                { text: 'Take Photo', onPress: () => pickImage(true) },
                { text: 'Choose from Library', onPress: () => pickImage(false) },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const removePhoto = (id: number) => {
        setPhotoSlots((prev) => {
            const updated = prev.filter((p) => p.id !== id);
            // If we removed the main photo, make the first one main
            if (updated.length > 0 && !updated.some((p) => p.isMain)) {
                updated[0].isMain = true;
            }
            onUpdate(updated.map((p) => p.uri!).filter(Boolean));
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
            onUpdate(updated.map((p) => p.uri!).filter(Boolean));
            return updated;
        });
    };

    const handlePhotoSelect = (index: number) => {
        if (selectedIndex === null) {
            // First selection - just select this photo
            setSelectedIndex(index);
        } else if (selectedIndex === index) {
            // Tapped same photo - deselect
            setSelectedIndex(null);
        } else {
            // Tapped different photo - swap them
            reorderPhotos(selectedIndex, index);
            setSelectedIndex(null);
        }
    };

    const emptySlots = 6 - photosWithContent.length;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f0d23', '#1a0d2e', '#0f0d23']}
                style={StyleSheet.absoluteFill}
            />

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
                <View style={styles.progressDots}>
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <View
                            key={i}
                            style={[styles.progressDot, i <= 2 && styles.progressDotActive]}
                        />
                    ))}
                </View>
            </View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={SlideInRight.springify()} style={styles.content}>
                    {/* Header */}
                    <View style={styles.iconContainer}>
                        <Camera size={32} color="#ec4899" weight="fill" />
                    </View>
                    <Text style={styles.title}>Show your best self</Text>
                    <Text style={styles.subtitle}>
                        Add at least 2 photos to continue.{'\n'}
                        Tip: Profiles with 4+ photos get 3x more matches! 📸
                    </Text>

                    {/* Photo grid */}
                    <View style={styles.photoGrid}>
                        {/* Existing photos */}
                        {photosWithContent.map((photo, index) => (
                            <DraggablePhoto
                                key={photo.id}
                                photo={photo}
                                index={index}
                                onRemove={removePhoto}
                                onSelect={handlePhotoSelect}
                                isSelected={selectedIndex === index}
                                selectedIndex={selectedIndex}
                                totalPhotos={photosWithContent.length}
                            />
                        ))}

                        {/* Empty slots */}
                        {Array.from({ length: emptySlots }).map((_, index) => (
                            <AddPhotoSlot
                                key={`empty-${index}`}
                                index={photosWithContent.length + index}
                                onPress={showImageOptions}
                            />
                        ))}
                    </View>

                    {/* Selection hint */}
                    {selectedIndex !== null && (
                        <Animated.View entering={FadeIn} style={styles.selectionHint}>
                            <Text style={styles.selectionHintText}>
                                Tap another photo to swap positions
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedIndex(null)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Tips */}
                    <Animated.View entering={FadeIn.delay(300)} style={styles.tipsContainer}>
                        <View style={styles.tip}>
                            <Sparkle size={16} color="#f472b6" weight="fill" />
                            <Text style={styles.tipText}>First photo is your main profile pic</Text>
                        </View>
                        <View style={styles.tip}>
                            <ArrowsClockwise size={16} color="#f472b6" weight="fill" />
                            <Text style={styles.tipText}>Hold a photo to move it</Text>
                        </View>
                    </Animated.View>

                    {/* Counter */}
                    <View style={styles.counterContainer}>
                        <Text style={[styles.counterText, hasMinPhotos && styles.counterValid]}>
                            {photosWithContent.length} / 6 photos
                        </Text>
                        {!hasMinPhotos && (
                            <Text style={styles.counterHint}>
                                Add {2 - photosWithContent.length} more to continue
                            </Text>
                        )}
                    </View>

                    {/* Continue button */}
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            onNext();
                        }}
                        disabled={!hasMinPhotos}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={hasMinPhotos ? ['#ec4899', '#f43f5e'] : ['#374151', '#374151']}
                            style={styles.continueButton}
                        >
                            <Text style={[styles.continueButtonText, !hasMinPhotos && styles.disabledText]}>
                                Continue
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    progressContainer: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 16,
    },
    progressDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    progressDotActive: {
        backgroundColor: '#ec4899',
        width: 24,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    content: {
        paddingHorizontal: 24,
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
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 32,
        lineHeight: 24,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    photoSlot: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE * 1.25,
        borderRadius: 16,
        overflow: 'hidden',
    },
    photoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    mainBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ec4899',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    mainBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    photoNumber: {
        position: 'absolute',
        top: 8,
        left: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
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
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoSlot: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE * 1.25,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipsContainer: {
        gap: 8,
        marginBottom: 24,
    },
    tip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tipText: {
        fontSize: 14,
        color: '#64748b',
    },
    counterContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    counterText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
    },
    counterValid: {
        color: '#10b981',
    },
    counterHint: {
        fontSize: 14,
        color: '#f59e0b',
        marginTop: 4,
    },
    selectionBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#ec4899',
    },
    swapIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(236, 72, 153, 0.5)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginBottom: 16,
    },
    selectionHintText: {
        fontSize: 14,
        color: '#f472b6',
        fontWeight: '500',
    },
    cancelText: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    continueButton: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginBottom: 40,
    },
    continueButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    disabledText: {
        color: '#6b7280',
    },
});
