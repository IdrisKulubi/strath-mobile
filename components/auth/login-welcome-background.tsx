import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';

type ThemeColors = (typeof Colors)['light'];

type Props = {
  isDark: boolean;
  colors: ThemeColors;
};

export function LoginWelcomeBackground({ isDark, colors }: Props) {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {isDark ? (
        <>
          <LinearGradient
            colors={['#0c0612', colors.background, '#1a0d2e']}
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(233,30,140,0.24)', 'rgba(147,51,234,0.14)', 'transparent']}
            locations={[0, 0.42, 1]}
            start={{ x: 0.4, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={[styles.glowBlob, { width: width * 1.08, height: height * 0.34, top: -height * 0.03 }]}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'transparent']}
            locations={[0, 0.35, 1]}
            start={{ x: 0.25, y: 0.1 }}
            end={{ x: 0.75, y: 0.9 }}
            style={[styles.glowBlob, { width: width * 0.9, height: height * 0.26, top: height * 0.18, left: -width * 0.12 }]}
          />
          <LinearGradient
            colors={['rgba(233,30,140,0.14)', 'rgba(233,30,140,0.05)', 'transparent']}
            locations={[0, 0.38, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.75, y: 0.95 }}
            style={[styles.glowBlob, { width: width * 0.72, height: height * 0.22, top: height * 0.52, right: -width * 0.08 }]}
          />
        </>
      ) : (
        <>
          <LinearGradient
            colors={['#FFF9FB', '#F5F0F4', '#FAF6F8']}
            locations={[0, 0.5, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(233,30,140,0.18)', 'rgba(255,214,230,0.12)', 'transparent']}
            locations={[0, 0.38, 1]}
            start={{ x: 0.45, y: 0 }}
            end={{ x: 0.85, y: 0.85 }}
            style={[styles.glowBlob, { width: width * 1.05, height: height * 0.34, top: -height * 0.02 }]}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.86)', 'rgba(255,255,255,0.18)', 'transparent']}
            locations={[0, 0.32, 1]}
            start={{ x: 0.3, y: 0.05 }}
            end={{ x: 0.85, y: 0.95 }}
            style={[styles.glowBlob, { width: width * 0.92, height: height * 0.28, top: height * 0.16, left: -width * 0.14 }]}
          />
          <LinearGradient
            colors={['rgba(233,30,140,0.11)', 'rgba(255,220,233,0.08)', 'transparent']}
            locations={[0, 0.3, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[styles.glowBlob, { width: width * 0.76, height: height * 0.22, top: height * 0.54, right: -width * 0.08 }]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  glowBlob: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 9999,
    opacity: Platform.OS === 'android' ? 0.9 : 1,
  },
});
