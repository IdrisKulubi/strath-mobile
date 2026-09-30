import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, HeartHandshake, MapPin } from 'lucide-react-native';
import { ProfileGallery } from '@/components/questionnaire/profile-gallery';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, PROFILE_PHOTO, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { compatibilityLabel, type Person } from '@/lib/questionnaire';

export function PortraitCard({ person }: { person: Person }) {
  const { colors } = useTheme();
  const router = useRouter();
  return <View style={[styles.card, { backgroundColor: colors.sheet }]}>
    <ProfileGallery key={person.id} photos={person.photos} name={person.name}>
      <Text accessibilityRole="header" numberOfLines={2} style={styles.name}>{person.name}, {person.age}</Text>
      {person.city ? <View style={styles.row}><MapPin size={17} color={PROFILE_PHOTO.foreground} /><Text numberOfLines={1} style={styles.location}>{person.city}</Text></View> : null}
      {person.university ? <Text numberOfLines={1} style={styles.location}>{person.university}</Text> : null}
    </ProfileGallery>
    <View style={styles.summary}>
      {person.compatibility ? <View style={styles.row}>
        <HeartHandshake size={22} color={colors.primaryText} />
        <Text style={[styles.compatibility, { color: colors.foreground }]}>{compatibilityLabel(person.compatibility)}</Text>
      </View> : null}
      {person.intentions.length ? <Text numberOfLines={2} style={[styles.intention, { color: colors.mutedForeground }]}>{person.intentions.join(' · ')}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${person.name}'s profile`}
        onPress={() => router.push(`/compatibility/${person.id}` as never)}
        style={[
          styles.profileButton,
          {
            backgroundColor: colors.control,
            borderColor: colors.controlBorder,
          },
        ]}
      >
        <View style={styles.profileButtonContent}>
          <Text style={[TYPOGRAPHY.headline, { color: colors.foreground }]}>View profile</Text>
          <ArrowRight size={20} color={colors.foreground} strokeWidth={2.25} />
        </View>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.row, overflow: 'hidden' },
  name: { ...TYPOGRAPHY.display, color: PROFILE_PHOTO.foreground },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.tight },
  location: { ...TYPOGRAPHY.callout, color: PROFILE_PHOTO.foreground, flexShrink: 1 },
  summary: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.base,
    gap: SPACING.tight,
  },
  compatibility: { ...TYPOGRAPHY.callout, fontWeight: '600', flex: 1 },
  intention: { ...TYPOGRAPHY.caption },
  profileButton: {
    minHeight: HEIGHTS.primaryControl,
    marginTop: SPACING.compact,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.tight,
  },
});
