/* eslint-disable react-hooks/immutability -- Reanimated shared values are updated for sheet motion and drag. */
import React, { useCallback, useEffect, useRef } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { MOTION, PROFILE_PHOTO as PHOTO, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.cubic);

function SheetPhoto({ uri, label }: { uri: string; label: string }) {
  return (
    <View style={styles.photoFrame} accessibilityLabel={label}>
      <Image source={{ uri }} style={styles.photo} resizeMode="cover" accessibilityLabel={label} />
    </View>
  );
}

export function ProfilePhotoGallerySheet({
  visible,
  images,
  name,
  index,
  onIndexChange,
  onClose,
}: {
  visible: boolean;
  images: string[];
  name: string;
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const pageWidth = Math.max(1, screenWidth);
  const sheetTravel = Math.max(480, screenHeight * 0.92);
  const reducedMotion = useReducedMotion();
  const motionMs = reducedMotion ? 0 : MOTION.short;
  const pager = useRef<ScrollView>(null);
  const translateY = useSharedValue(sheetTravel);
  const backdropOpacity = useSharedValue(0);
  const opened = useRef(false);

  const finishClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const closeSheet = useCallback(() => {
    translateY.value = withTiming(sheetTravel, { duration: motionMs, easing: easeIn }, () => {
      runOnJS(finishClose)();
    });
    backdropOpacity.value = withTiming(0, { duration: reducedMotion ? 0 : MOTION.micro, easing: easeOut });
  }, [backdropOpacity, finishClose, motionMs, reducedMotion, sheetTravel, translateY]);

  useEffect(() => {
    if (!visible) return;
    opened.current = false;
    translateY.value = sheetTravel;
    backdropOpacity.value = 0;
    translateY.value = withTiming(0, { duration: motionMs, easing: easeOut });
    backdropOpacity.value = withTiming(1, { duration: motionMs, easing: easeOut });
  }, [backdropOpacity, motionMs, sheetTravel, translateY, visible]);

  useEffect(() => {
    if (!visible || !pageWidth || opened.current) return;
    pager.current?.scrollTo({ x: index * pageWidth, animated: false });
    opened.current = true;
  }, [index, pageWidth, visible]);

  const dragGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > 88 || event.velocityY > 700) {
        runOnJS(closeSheet)();
      } else {
        translateY.value = withTiming(0, { duration: MOTION.micro, easing: easeOut });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!visible || !images.length) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={closeSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle, { backgroundColor: PHOTO.scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close photos" onPress={closeSheet} />
        </Animated.View>

        <GestureDetector gesture={dragGesture}>
          <Animated.View
            style={[
              styles.sheet,
              sheetStyle,
              { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, SPACING.comfortable), width: screenWidth },
            ]}>
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.mutedForeground }]} />
            </View>

            <View style={styles.header}>
              <View style={styles.headerText}>
                {images.length > 1 ? (
                  <View style={styles.segments}>
                    {images.map((_, i) => (
                      <View key={i} style={[styles.segment, { backgroundColor: i === index ? colors.foreground : colors.controlBorder }]} />
                    ))}
                  </View>
                ) : null}
                <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>{name}</Text>
                <Text accessibilityLiveRegion="polite" style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  Photo {index + 1} of {images.length}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close photos" onPress={closeSheet}
                style={styles.close}>
                <X size={22} color={PHOTO.foreground} />
              </Pressable>
            </View>

            <ScrollView
              ref={pager}
              horizontal
              pagingEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              style={[styles.pager, { width: pageWidth }]}
              onMomentumScrollEnd={(event) => onIndexChange(Math.round(event.nativeEvent.contentOffset.x / pageWidth))}>
              {images.map((uri, i) => (
                <View key={`${uri}:${i}`} style={{ width: pageWidth, paddingHorizontal: SPACING.base }}>
                  <SheetPhoto uri={uri} label={`${name}, photo ${i + 1} of ${images.length}`} />
                </View>
              ))}
            </ScrollView>

            {images.length > 1 ? (
              <Text style={[styles.hint, { color: colors.mutedForeground, paddingHorizontal: SPACING.base }]}>Swipe for more photos · Pull down to close</Text>
            ) : (
              <Text style={[styles.hint, { color: colors.mutedForeground, paddingHorizontal: SPACING.base }]}>Pull down or tap outside to close</Text>
            )}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: {
    alignSelf: 'center',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.tight, marginBottom: SPACING.compact, paddingHorizontal: SPACING.base },
  handleRow: { alignItems: 'center', paddingTop: SPACING.tight, paddingBottom: SPACING.compact },
  handle: { width: 44, height: 5, borderRadius: RADIUS.full, opacity: 0.35 },
  headerText: { flex: 1, gap: SPACING.micro, minWidth: 0 },
  segments: { flexDirection: 'row', gap: SPACING.micro, marginBottom: SPACING.micro },
  segment: { flex: 1, height: 3, borderRadius: RADIUS.full, maxWidth: 48 },
  title: { ...TYPOGRAPHY.title },
  subtitle: { ...TYPOGRAPHY.caption },
  pager: { flexGrow: 0 },
  photoFrame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: RADIUS.row,
    overflow: 'hidden',
    backgroundColor: PHOTO.background,
  },
  photo: { width: '100%', height: '100%' },
  hint: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: SPACING.compact },
  close: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: PHOTO.control,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
