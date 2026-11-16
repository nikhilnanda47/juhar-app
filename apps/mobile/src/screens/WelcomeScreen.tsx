import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  PanResponder,
} from 'react-native';
import {
  ArrowRight, ShoppingBag, ShieldCheck, Award, Truck, Handshake,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.min(380, SCREEN_WIDTH * (4 / 3));

const SLIDES = [
  {
    headline: 'Handwoven with care',
    body: 'Sambalpuri sarees made by master weavers from Western Odisha.',
    badge: 'Bargarh Cluster, Odisha',
    badgeIcon: 'verified',
    bgColor: '#E8D5C4',
  },
  {
    headline: 'Direct from the loom',
    body: 'No middlemen. Fair prices for weavers, honest prices for you.',
    badge: 'Direct Weaver Cooperative',
    badgeIcon: 'handshake',
    bgColor: '#D5C4B0',
  },
  {
    headline: 'Delivered to your door',
    body: 'Cash on delivery. Easy returns. 5–7 day doorstep shipping.',
    badge: 'Insured Safe Transit',
    badgeIcon: 'truck',
    bgColor: '#C9B8A8',
  },
];

interface Props {
  onComplete: () => void;
}

export default function WelcomeScreen({ onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const fadeAnims = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const textTranslate = useRef(new Animated.Value(0)).current;

  const goToSlide = (index: number) => {
    if (index < 0 || index >= SLIDES.length || index === current) return;

    // Fade out current visual, fade in new
    Animated.parallel([
      Animated.timing(fadeAnims[current], { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeAnims[index], { toValue: 1, duration: 500, useNativeDriver: true }),
      // Text out
      Animated.timing(textOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(textTranslate, { toValue: 8, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setCurrent(index);
      // Text in
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

  const BadgeIcon = current === 0 ? Award : current === 1 ? Handshake : Truck;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Award size={18} color={colors.primary} strokeWidth={1.5} />
          <Text style={styles.brandLabel}>KALAVASTRA</Text>
        </View>
        <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
          <Text style={styles.skipText}>Skip</Text>
          <ArrowRight size={16} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Image carousel */}
      <View style={styles.imageContainer} {...panResponder.panHandlers}>
        {SLIDES.map((s, i) => (
          <Animated.View
            key={i}
            style={[styles.slideVisual, { opacity: fadeAnims[i], zIndex: i === current ? 1 : 0 }]}
          >
            <View style={[styles.imagePlaceholder, { backgroundColor: s.bgColor }]}>
              {/* Gradient overlay */}
              <View style={styles.imageGradient} />
              {/* Badge */}
              <View style={styles.imageBadge}>
                {i === 0 ? <Award size={14} color="#745a35" strokeWidth={1.5} /> :
                 i === 1 ? <Handshake size={14} color="#745a35" strokeWidth={1.5} /> :
                 <Truck size={14} color="#745a35" strokeWidth={1.5} />}
                <Text style={styles.imageBadgeText}>{s.badge}</Text>
              </View>
            </View>
          </Animated.View>
        ))}
        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <Text style={styles.swipeText}>Swipe</Text>
        </View>
      </View>

      {/* Text content */}
      <Animated.View style={[styles.textBlock, { opacity: textOpacity, transform: [{ translateY: textTranslate }] }]}>
        <Text style={styles.headline}>{slide.headline}</Text>
        <Text style={styles.bodyText}>{slide.body}</Text>
      </Animated.View>

      {/* Pagination dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
            <View style={[styles.dot, i === current ? styles.dotActive : styles.dotInactive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity style={styles.ctaBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{isLast ? 'Start Shopping' : 'Next'}</Text>
          {isLast
            ? <ShoppingBag size={18} color={colors.white} strokeWidth={2} />
            : <ArrowRight size={18} color={colors.white} strokeWidth={2} />
          }
        </TouchableOpacity>
        <View style={styles.reassurance}>
          <ShieldCheck size={14} color="#745a35" strokeWidth={1.5} />
          <Text style={styles.reassuranceText}>100% Authentic Handloom Certified</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.margin },

  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    height: 48, marginTop: 8, marginBottom: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
  brandLabel: {
    fontFamily: 'DMSans-SemiBold', fontSize: 11, color: 'rgba(84,66,68,0.7)',
    letterSpacing: 3, textTransform: 'uppercase',
  },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12 },
  skipText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.primary },

  // Image
  imageContainer: {
    width: '100%', aspectRatio: 3 / 4, maxHeight: IMAGE_HEIGHT,
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
    backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  imageBadgeText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textPrimary, letterSpacing: 0.66 },
  swipeHint: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.full, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  swipeText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: 'rgba(84,66,68,0.7)' },

  // Text
  textBlock: { alignItems: 'center', marginTop: spacing.lg, paddingHorizontal: 8, minHeight: 92 },
  headline: {
    fontFamily: 'NotoSerif-Regular', fontSize: 22, lineHeight: 28,
    color: colors.textPrimary, letterSpacing: -0.22, textAlign: 'center', marginBottom: 8,
  },
  bodyText: {
    fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 22,
    color: 'rgba(84,66,68,0.8)', textAlign: 'center', maxWidth: 280,
  },

  // Dots
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.md, marginBottom: spacing.lg },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: '#8b3a4a' },
  dotInactive: { width: 8, backgroundColor: '#e2e3e0' },

  // CTA
  ctaWrap: { marginTop: 'auto', paddingTop: 8, paddingBottom: 16 },
  ctaBtn: {
    width: '100%', height: 48, borderRadius: 8, backgroundColor: '#8b3a4a',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.white },
  reassurance: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
  },
  reassuranceText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: 'rgba(84,66,68,0.7)', letterSpacing: 0.66 },
});
