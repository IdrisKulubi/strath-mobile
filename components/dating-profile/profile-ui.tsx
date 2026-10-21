import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

export type OwnDatingProfile = { profile: {
  first_name: string; gender: string; about_me: string; photos: string[];
  university: string | null; course: string | null; year_of_study: number | null;
  face_verification_status: string;
} | null };

export function ProfileRow({ icon, title, detail, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; title: string; detail: string; onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.rowPressable, { borderBottomColor: colors.controlBorder, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={styles.rowContent}>
        <View style={[styles.icon, { backgroundColor: colors.control }]}>
          <Ionicons name={icon} size={22} color={colors.foreground} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.label, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>{detail}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

export function ProfileSection({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={styles.section}>
    <View style={styles.sectionHeading}><Text accessibilityRole="header" style={[styles.heading, { color: colors.foreground }]}>{title}</Text>
      {onEdit ? <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${title.toLowerCase()}`} onPress={onEdit} style={styles.edit}><Text style={[styles.label, { color: colors.primaryText }]}>Edit</Text></Pressable> : null}
    </View>{children}
  </View>;
}

export function ProfilePhoto({ uri, label, large = false }: { uri?: string; label: string; large?: boolean }) {
  const { colors } = useTheme();
  const [failedUri, setFailedUri] = React.useState<string>();
  return <View style={[large ? styles.hero : styles.photo, { backgroundColor: colors.control }]}>
    {uri && failedUri !== uri ? <Image source={{ uri }} accessibilityLabel={label} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailedUri(uri)} /> : <Ionicons name="person-outline" size={40} color={colors.mutedForeground} accessibilityLabel="Photo unavailable" />}
  </View>;
}

const styles = StyleSheet.create({
  rowPressable: { width: '100%', minHeight: 72, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  rowContent: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  icon: { width: 44, height: 44, borderRadius: 16, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '600' }, caption: { fontSize: 13, lineHeight: 19 },
  heading: { fontSize: 20, fontWeight: '600', flex: 1 }, section: { gap: 12, marginTop: 8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, edit: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'flex-end' },
  hero: { width: 88, height: 108, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', aspectRatio: 0.8, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
