import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Expand, ImageOff, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ProfilePhotoGallerySheet } from '@/components/questionnaire/profile-photo-gallery-sheet';
import { PROFILE_PHOTO as PHOTO, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function PhotoButton({ label, onPress, children, disabled = false }: {
  label: string; onPress: () => void; children: React.ReactNode; disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}
    style={[styles.circle, { opacity: disabled ? 0.3 : pressed ? 0.65 : 1 }]}>
    {children}
  </Pressable>;
}

function Photo({ uri, label }: { uri: string; label: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  return <View style={styles.imageContainer}>
    <Image key={`${uri}:${attempt}`} source={{ uri }} accessibilityLabel={label} resizeMode="cover"
      style={StyleSheet.absoluteFill} onLoad={() => setState('ready')} onError={() => setState('error')} />
    {state === 'loading' ? <ActivityIndicator color={PHOTO.foreground} accessibilityLabel="Loading photo" /> : null}
    {state === 'error' ? <View style={styles.placeholder}>
      <ImageOff size={28} color={PHOTO.foreground} />
      <Text style={styles.photoText}>Photo couldn’t load</Text>
      <PhotoButton label="Retry photo" onPress={() => { setState('loading'); setAttempt((value) => value + 1); }}>
        <RotateCcw size={22} color={PHOTO.foreground} />
      </PhotoButton>
    </View> : null}
  </View>;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function ProfileGallery({ photos, name, children, topLeft, topRight, initialIndex = 0, bleed = false, minimalChrome = false, overlayTopInset = 0, photosVisible, onPhotosVisibleChange }: {
  photos: string[]; name: string; children?: React.ReactNode; topLeft?: React.ReactNode; topRight?: React.ReactNode; initialIndex?: number;
  bleed?: boolean; minimalChrome?: boolean; overlayTopInset?: number;
  photosVisible?: boolean; onPhotosVisibleChange?: (visible: boolean) => void;
}) {
  const images = photos.filter(Boolean);
  const [selected, setSelected] = useState(initialIndex);
  const index = clamp(selected, 0, Math.max(0, images.length - 1));
  const [width, setWidth] = useState(0);
  const [localSheetOpen, setLocalSheetOpen] = useState(false);
  const sheetOpen = photosVisible ?? localSheetOpen;
  const setSheetOpen = onPhotosVisibleChange ?? setLocalSheetOpen;
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pager = useRef<ScrollView>(null);
  useEffect(() => { if (width) pager.current?.scrollTo({ x: index * width, animated: sheetOpen }); }, [index, width, sheetOpen]);
  const go = (direction: number) => setSelected(clamp(index + direction, 0, images.length - 1));
  const showChrome = !minimalChrome;
  return <>
    <View style={[styles.hero, bleed && styles.heroBleed]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {images.length && width ? <ScrollView ref={pager} horizontal pagingEnabled directionalLockEnabled
        onTouchStart={(event) => { touchStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; }}
        onTouchEnd={(event) => {
          if (!touchStart.current) return;
          const dx = Math.abs(event.nativeEvent.pageX - touchStart.current.x);
          const dy = Math.abs(event.nativeEvent.pageY - touchStart.current.y);
          touchStart.current = null;
          if (dx < 10 && dy < 10) setSheetOpen(true);
        }}
        showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setSelected(Math.round(event.nativeEvent.contentOffset.x / width))}
        style={StyleSheet.absoluteFill}>
        {images.map((uri, i) => <View key={`${uri}:${i}`} style={{ width, height: '100%' }}>
          <Photo uri={uri} label={`${name}, photo ${i + 1} of ${images.length}`} />
        </View>)}
      </ScrollView> : <View style={styles.placeholder}><ImageOff size={32} color={PHOTO.foreground} /><Text style={styles.photoText}>No photos yet</Text></View>}
      <LinearGradient pointerEvents="none" colors={[PHOTO.transparent, PHOTO.scrim]} style={styles.scrim} />
      <View style={[styles.top, { top: overlayTopInset + SPACING.tight }]} pointerEvents="box-none">
        {!minimalChrome && images.length > 1 ? <View style={styles.segments} pointerEvents="none">{images.map((_, i) => <View key={i} style={[styles.segment, { backgroundColor: i === index ? PHOTO.foreground : PHOTO.track }]} />)}</View> : null}
        <View style={styles.row} pointerEvents="box-none">
          {topLeft ?? <View />}
          {minimalChrome ? <View style={styles.centerSegments} pointerEvents="none">{images.map((_, i) => <View key={i} style={[styles.segment, { backgroundColor: i === index ? PHOTO.foreground : PHOTO.track }]} />)}</View> : null}
          <View style={styles.tools}>
            {showChrome && images.length ? <Text style={styles.counter}>{index + 1} / {images.length}</Text> : null}
            {showChrome && images.length ? <PhotoButton label={`View ${name}'s photos`} onPress={() => setSheetOpen(true)}><Expand size={21} color={PHOTO.foreground} /></PhotoButton> : null}
            {topRight}
          </View>
        </View>
      </View>
      {showChrome && images.length > 1 ? <View style={styles.arrows} pointerEvents="box-none">
        <PhotoButton label="Previous photo" disabled={index === 0} onPress={() => go(-1)}><ChevronLeft size={25} color={PHOTO.foreground} /></PhotoButton>
        <PhotoButton label="Next photo" disabled={index === images.length - 1} onPress={() => go(1)}><ChevronRight size={25} color={PHOTO.foreground} /></PhotoButton>
      </View> : null}
      <View style={styles.identity} pointerEvents="none">{children}</View>
    </View>
    <ProfilePhotoGallerySheet visible={sheetOpen} images={images} name={name} index={index}
      onIndexChange={setSelected} onClose={() => setSheetOpen(false)} />
  </>;
}

const styles = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 3 / 4, borderRadius: RADIUS.row, overflow: 'hidden', backgroundColor: PHOTO.background },
  heroBleed: { borderRadius: 0, aspectRatio: 5 / 6 },
  imageContainer: { flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: PHOTO.background },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.compact },
  photoText: { ...TYPOGRAPHY.caption, color: PHOTO.foreground },
  circle: { width: 48, height: 48, borderRadius: RADIUS.full, backgroundColor: PHOTO.control, justifyContent: 'center', alignItems: 'center' },
  scrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '48%' },
  top: { position: 'absolute', top: SPACING.compact, left: SPACING.compact, right: SPACING.compact, gap: SPACING.tight },
  segments: { flexDirection: 'row', gap: SPACING.micro },
  centerSegments: { flex: 1, maxWidth: 160, marginHorizontal: SPACING.base, flexDirection: 'row', gap: SPACING.micro },
  segment: { flex: 1, height: 3, borderRadius: RADIUS.full },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tools: { flexDirection: 'row', gap: SPACING.tight, alignItems: 'center' },
  counter: { ...TYPOGRAPHY.caption, color: PHOTO.foreground, backgroundColor: PHOTO.control, paddingHorizontal: SPACING.compact, paddingVertical: SPACING.tight, borderRadius: RADIUS.full },
  arrows: { position: 'absolute', top: '42%', left: SPACING.tight, right: SPACING.tight, flexDirection: 'row', justifyContent: 'space-between' },
  identity: { position: 'absolute', bottom: SPACING.comfortable, left: SPACING.comfortable, right: SPACING.comfortable, gap: SPACING.tight },
});
