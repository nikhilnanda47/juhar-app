import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme, type ColorPalette } from '../theme';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslate = useRef(new Animated.Value(8)).current;
  const footnoteOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(brandTranslate, {
        toValue: 0, duration: 1000, useNativeDriver: true, easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    setTimeout(() => {
      Animated.timing(footnoteOpacity, {
        toValue: 1, duration: 1000, useNativeDriver: true,
      }).start();
    }, 500);

    const pulseDot = (dot: Animated.Value, delay: number) => {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 700, useNativeDriver: true, delay }),
          Animated.timing(dot, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        ]).start(pulse);
      };
      pulse();
    };
    pulseDot(dot1, 100);
    pulseDot(dot2, 300);
    pulseDot(dot3, 500);

    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topSpacer} />
      <Animated.View style={[styles.brandCore, { opacity: brandOpacity, transform: [{ translateY: brandTranslate }] }]}>
        <Text style={styles.wordmark}>Juhar</Text>
        <Text style={styles.odiaScript}>{'ଜୁହାର୍'}</Text>
        <Text style={styles.tagline}>A Tradition Worth Wearing</Text>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, styles.dotAccent, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, styles.dotDim, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, styles.dotDim, { opacity: dot3 }]} />
        </View>
      </Animated.View>
      <Animated.View style={[styles.footnote, { opacity: footnoteOpacity }]}>
        <Text style={styles.footnoteText}>HANDLOOM TRADITIONS OF ODISHA</Text>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 32,
  },
  topSpacer: { height: 32 },
  brandCore: { alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    fontFamily: 'NotoSerif-Regular', fontSize: 28, lineHeight: 34,
    color: colors.primary, letterSpacing: -0.42,
  },
  odiaScript: {
    fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 22,
    color: colors.textBrand, marginTop: 4, opacity: 0.8,
  },
  tagline: {
    fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 18,
    color: colors.textBrandLight, marginTop: 8, letterSpacing: 1.5,
    textTransform: 'uppercase', opacity: 0.6,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, opacity: 0.6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotAccent: { backgroundColor: colors.accentDark },
  dotDim: { backgroundColor: colors.accent },
  footnote: { paddingBottom: 8 },
  footnoteText: {
    fontFamily: 'DMSans-SemiBold', fontSize: 11, lineHeight: 14,
    color: colors.textBrandLight, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.5,
  },
});
