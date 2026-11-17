import { StyleSheet, Platform } from 'react-native';
import { colors } from './colors';

/**
 * Typography — UI Specification v2.0
 *
 * Two fonts: Noto Serif (headlines) + DM Sans (everything else).
 * Custom fonts loaded via expo-font in App.tsx.
 */

const headlineFamily = Platform.select({
  web: '"Noto Serif", Georgia, serif',
  default: 'NotoSerif-Regular',
});

const bodyFamily = Platform.select({
  web: '"DM Sans", -apple-system, sans-serif',
  default: 'DMSans-Regular',
});

const bodyMedium = Platform.select({
  web: '"DM Sans", -apple-system, sans-serif',
  default: 'DMSans-Medium',
});

const bodySemiBold = Platform.select({
  web: '"DM Sans", -apple-system, sans-serif',
  default: 'DMSans-SemiBold',
});

const bodyBold = Platform.select({
  web: '"DM Sans", -apple-system, sans-serif',
  default: 'DMSans-Bold',
});

export const typography = StyleSheet.create({
  // ── Headlines (Noto Serif) ──
  pageTitle: {
    fontFamily: headlineFamily,
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 32,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontFamily: headlineFamily,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
    color: colors.textPrimary,
  },
  screenHeadline: {
    fontFamily: headlineFamily,
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 28,
    color: colors.textPrimary,
  },

  // ── Body (DM Sans) ──
  productTitle: {
    fontFamily: bodyMedium,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: bodyFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodySecondary: {
    fontFamily: bodyFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.textSecondary,
  },
  caption: {
    fontFamily: bodyFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    color: colors.textSecondary,
  },
  captionTertiary: {
    fontFamily: bodyFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    color: colors.textTertiary,
  },

  // ── Prices (DM Sans) ──
  price: {
    fontFamily: bodyBold,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    color: colors.textPrimary,
  },
  priceStrike: {
    fontFamily: bodyFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  priceSmall: {
    fontFamily: bodyBold,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    color: colors.textPrimary,
  },

  // ── Buttons (DM Sans) ──
  button: {
    fontFamily: bodySemiBold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  // ── Badges (DM Sans) ──
  badge: {
    fontFamily: bodySemiBold,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textTransform: 'uppercase',
  },

  // ── Tab Bar (DM Sans) ──
  tabLabel: {
    fontFamily: bodyMedium,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },

  // ── Navigation Header ──
  navTitle: {
    fontFamily: bodyMedium,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: colors.textPrimary,
  },

  // ── Input Label ──
  inputLabel: {
    fontFamily: bodyFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
