import React, { useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  PanResponder,
} from 'react-native';
import {
  ArrowRight, ShoppingBag, ShieldCheck, Award, Truck, Handshake,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ColorPalette, spacing, borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.min(380, SCREEN_WIDTH * (4 / 3));

const SLIDES = [
  {
    headline: 'Handwoven with care',
    body: 'Sambalpuri sarees made by master weavers from Western Odisha.',
    badge: 'Bargarh Cluster, Odisha',
    bgColor: '#E8D5C4',
    bgColorDark: '#3A2E24',
  },
  {
    headline: 'Direct from the loom',
    body: 'No middlemen. Fair prices for weavers, honest prices for you.',
    badge: 'Direct Weaver Cooperative',
    bgColor: '#D5C4B0',
    bgColorDark: '#2E2A20',
  },
  {
    headline: 'Delivered to your door',
    body: 'Cash on delivery. Easy returns. 5–7 day doorstep shipping.',
    badge: 'Insured Safe Transit',
    bgColor: '#C9B8A8',
    bgColorDark: '#282420',
  },
];

interface Props {
  onComplete: () => void;
}

export default function WelcomeScreen({ onComplete }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets(); // keep the top bar below the status bar and the button above the home bar
  const [current, setCurrent] = useState(0);
  const fadeAnims = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const textTranslate = useRef(new Animated.Value(0)).current;

  const goToSlide = (index: number) => {
    if (index < 0 || index >= SLIDES.length || index === current) return;
    Animated.parallel([
      Animated.timing(fadeAnims[current], { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeAnims[index], { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(textTranslate, { toValue: 8, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setCurrent(index);
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(textTranslate, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 20,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -40 && current < SLIDES.length - 1) goToSlide(current + 1);
        else if (gs.dx > 40 && current > 0) goToSlide(current - 1);
      },
    })
  ).current;

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      goToSlide(current + 1);
    } else {
      onComplete();
    }
  };

  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Award size={18} color={colors.primary} strokeWidth={1.5} />
          <Text style={styles.brandLabel}>JUHAR</Text>
        </View>
        <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
          <Text style={styles.skipText}>Skip</Text>
          <ArrowRight size={16} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer} {...panResponder.panHandlers}>
        {SLIDES.map((s, i) => (
          <Animated.View
            key={i}
            style={[styles.slideVisual, { opacity: fadeAnims[i], zIndex: i === current ? 1 : 0 }]}
          >
            <View style={[styles.imagePlaceholder, { backgroundColor: isDark ? s.bgColorDark : s.bgColor }]}>
              <View style={styles.imageGradient} />
              <View style={styles.imageBadge}>
                {i === 0 ? <Award size={14} color={colors.accentDark} strokeWidth={1.5} /> :
                 i === 1 ? <Handshake size={14} color={colors.accentDark} strokeWidth={1.5} /> :
                 <Truck size={14} color={colors.accentDark} strokeWidth={1.5} />}
                <Text style={styles.imageBadgeText}>{s.badge}</Text>
              </View>
            </View>
          </Animated.View>
        ))}
        <View style={styles.swipeHint}>
          <Text style={styles.swipeText}>Swipe</Text>
        </View>
      </View>

      <Animated.View style={[styles.textBlock, { opacity: textOpacity, transform: [{ translateY: textTranslate }] }]}>
        <Text style={styles.headline}>{slide.headline}</Text>
        <Text style={styles.bodyText}>{slide.body}</Text>
      </Animated.View>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
            <View style={[styles.dot, i === current ? styles.dotActive : styles.dotInactive]} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.ctaWrap, { paddingBottom: Math.max(16, insets.bottom) }]}>
        <TouchableOpacity style={styles.ctaBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{isLast ? 'Start Shopping' : 'Next'}</Text>
          {isLast
            ? <ShoppingBag size={18} color={colors.white} strokeWidth={2} />
            : <ArrowRight size={18} color={colors.white} strokeWidth={2} />
          }
        </TouchableOpacity>
        <View style={styles.reassurance}>
          <ShieldCheck size={14} color={colors.accentDark} strokeWidth={1.5} />
          <Text style={styles.reassuranceText}>100% Authentic Handloom Certified</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.margin },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    height: 48, marginTop: 8, marginBottom: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
  brandLabel: {
    fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textBrandLight,
    letterSpacing: 3, textTransform: 'uppercase',
  },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12 },
  skipText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.primary },

  imageContainer: {
    width: '100%', height: IMAGE_HEIGHT, // a fixed height: with an aspect ratio too, a phone shrinks the width to fit and leaves a blank strip
    borderRadius: 12, overflow: 'hidden', position: 'relative',
  },
  slideVisual: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  imagePlaceholder: { flex: 1, justifyContent: 'flex-end' },
  imageGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
    backgroundColor: 'transparent',
  },
  imageBadge: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceOverlay, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  imageBadgeText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textPrimary, letterSpacing: 0.66 },
  swipeHint: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: colors.surfaceOverlay, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.full, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  swipeText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textBrandLight },

  textBlock: { alignItems: 'center', marginTop: spacing.lg, paddingHorizontal: 8, minHeight: 92 },
  headline: {
    fontFamily: 'NotoSerif-Regular', fontSize: 22, lineHeight: 28,
    color: colors.textPrimary, letterSpacing: -0.22, textAlign: 'center', marginBottom: 8,
  },
  bodyText: {
    fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 22,
    color: colors.textBrand, textAlign: 'center', maxWidth: 280, opacity: 0.8,
  },

  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.md, marginBottom: spacing.lg },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.borderMedium },

  ctaWrap: { marginTop: 'auto', paddingTop: 8, paddingBottom: 16 },
  ctaBtn: {
    width: '100%', height: 48, borderRadius: 8, backgroundColor: colors.primary,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.white },
  reassurance: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
  },
  reassuranceText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textBrandLight, letterSpacing: 0.66 },
});
