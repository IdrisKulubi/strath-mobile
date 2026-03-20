import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { getIntroPalette, type IntroScheme } from '@/constants/intro-theme';

type Props = {
  scheme: IntroScheme;
  style?: StyleProp<ViewStyle>;
  /** 0–1 drives soft drift of the glow layer */
  glowShift?: SharedValue<number>;
};

export function GradientGlowBackground({ scheme, style, glowShift }: Props) {
  const p = getIntroPalette(scheme);

  const glowStyle = useAnimatedStyle(() => {
    const t = glowShift?.value ?? 0.5;
    return {
      transform: [{ translateX: (t - 0.5) * 56 }, { translateY: (t - 0.5) * -40 }],
      opacity: 0.85 + (glowShift ? (t - 0.5) * 0.2 : 0),
    };
  });

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[p.baseTop, p.baseBottom]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.glowWrap, glowStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', p.glowC, p.glowA, 'transparent']}
          locations={[0, 0.35, 0.62, 1]}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.85, y: 0.95 }}
          style={styles.glowBlob}
        />
        <LinearGradient
          colors={['transparent', p.glowB, 'transparent']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.9, y: 0.2 }}
          end={{ x: 0.1, y: 0.8 }}
          style={[styles.glowBlob, styles.glowBlobSecondary]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBlob: {
    position: 'absolute',
    width: '140%',
    height: '120%',
    top: '-10%',
  },
  glowBlobSecondary: {
    opacity: 0.7,
  },
});
