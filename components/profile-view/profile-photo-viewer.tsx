import React, { useCallback, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { CachedImage } from '@/components/ui/cached-image';

interface ProfilePhotoViewerProps {
    visible: boolean;
    uri: string | null;
    onClose: () => void;
}

export function ProfilePhotoViewer({ visible, uri, onClose }: ProfilePhotoViewerProps) {
    const translateY = useSharedValue(520);
    const backdropOpacity = useSharedValue(0);

    const openSheet = useCallback(() => {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
        backdropOpacity.value = withTiming(1, { duration: 220 });
    }, [backdropOpacity, translateY]);

    const closeSheet = useCallback(() => {
        translateY.value = withTiming(520, { duration: 220 }, () => {
            runOnJS(onClose)();
        });
        backdropOpacity.value = withTiming(0, { duration: 180 });
    }, [backdropOpacity, onClose, translateY]);

    useEffect(() => {
        if (visible && uri) {
            openSheet();
        }
    }, [openSheet, uri, visible]);

    const dragGesture = Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-20, 20])
        .onUpdate((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            if (event.translationY > 100 || event.velocityY > 800) {
                runOnJS(closeSheet)();
            } else {
                translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
            }
        });

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    if (!uri) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={closeSheet}
        >
            <View style={styles.root}>
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
                </Animated.View>

                <GestureDetector gesture={dragGesture}>
                    <Animated.View style={[styles.sheet, sheetStyle]}>
                        <View style={styles.handle}>
                            <View style={styles.dragBar} />
                        </View>

                        <Pressable style={styles.imageWrap} onPress={() => {}}>
                            <CachedImage
                                uri={uri}
                                style={styles.image}
                                contentFit="contain"
                            />
                        </Pressable>
                    </Animated.View>
                </GestureDetector>
            </View>
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
        backgroundColor: 'rgba(0,0,0,0.92)',
    },
    sheet: {
        minHeight: '60%',
        maxHeight: '88%',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 28,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        backgroundColor: 'rgba(18,18,18,0.82)',
        overflow: 'hidden',
    },
    handle: {
        alignItems: 'center',
        paddingBottom: 14,
    },
    dragBar: {
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.32)',
    },
    imageWrap: {
        width: '100%',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 28,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
