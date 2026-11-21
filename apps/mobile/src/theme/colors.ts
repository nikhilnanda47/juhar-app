/**
 * Juhar color palette — UI Specification v2.0
 * Soft Burgundy + Warm Bronze, clean/minimal design system.
 */
export const lightColors = {
  // ── Brand ──
  primary: '#8B3A4A',
  primaryDark: '#6B1D2A',
  accent: '#B5956B',

  // ── Neutrals ──
  background: '#FAFAF7',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#999999',
  border: '#EEEEEE',

  // ── Functional ──
  success: '#3D8B63',
  warning: '#D4923A',
  error: '#C44A4A',

  // ── Status Badge Backgrounds ──
  statusPlacedBg: '#E3F2FD',
  statusPlacedText: '#1565C0',
  statusConfirmedBg: '#FFF8E1',
  statusConfirmedText: '#F57F17',
  statusPackedBg: '#FFF3E0',
  statusPackedText: '#E65100',
  statusShippedBg: '#FFF3E0',
  statusShippedText: '#E65100',
  statusDeliveredBg: '#E8F5E9',
  statusDeliveredText: '#2E7D32',
  statusCancelledBg: '#FCE4EC',
  statusCancelledText: '#C62828',

  // ── Special ──
  whatsapp: '#25D366',
  wishlistActive: '#C44A4A',

  // ── Extended Surface ──
  surfaceAlt: '#F4F4F1',
  surfaceMuted: '#E8E8E5',
  borderMedium: '#E2E3E0',
  placeholder: '#E0DDD8',
  stickyBar: 'rgba(255,255,255,0.95)',
  surfaceOverlay: 'rgba(255,255,255,0.85)',

  // ── Extended Text ──
  textBrand: '#544244',
  textBrandLight: '#877274',

  // ── Extended Accent ──
  accentBg: 'rgba(255,218,171,0.3)',
  accentDark: '#795E38',
  toastBg: '#1A1A2E',
  errorBg: '#FFDAD6',
  warningBg: '#FFDAAB',
  successBg: 'rgba(61,139,99,0.1)',

  // ── Convenience ──
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const darkColors: typeof lightColors = {
  // ── Brand (unchanged) ──
  primary: '#8B3A4A',
  primaryDark: '#6B1D2A',
  accent: '#B5956B',

  // ── Neutrals ──
  background: '#121212',
  surface: '#1E1E1E',
  textPrimary: '#EAEAEA',
  textSecondary: '#A0A0A0',
  textTertiary: '#666666',
  border: '#2C2C2C',

  // ── Functional (unchanged) ──
  success: '#3D8B63',
  warning: '#D4923A',
  error: '#C44A4A',

  // ── Status Badge Backgrounds (darkened) ──
  statusPlacedBg: '#1A2A3D',
  statusPlacedText: '#64B5F6',
  statusConfirmedBg: '#2D2A1A',
  statusConfirmedText: '#FFD54F',
  statusPackedBg: '#2D2316',
  statusPackedText: '#FFB74D',
  statusShippedBg: '#2D2316',
  statusShippedText: '#FFB74D',
  statusDeliveredBg: '#1A2D1E',
  statusDeliveredText: '#66BB6A',
  statusCancelledBg: '#2D1A1E',
  statusCancelledText: '#EF5350',

  // ── Special ──
  whatsapp: '#25D366',
  wishlistActive: '#C44A4A',

  // ── Extended Surface ──
  surfaceAlt: '#1A1A1A',
  surfaceMuted: '#2C2C2C',
  borderMedium: '#3A3A3A',
  placeholder: '#2A2A2A',
  stickyBar: 'rgba(18,18,18,0.95)',
  surfaceOverlay: 'rgba(30,30,30,0.85)',

  // ── Extended Text ──
  textBrand: '#C4B0B2',
  textBrandLight: '#9A8A8C',

  // ── Extended Accent ──
  accentBg: 'rgba(181,149,107,0.15)',
  accentDark: '#C4A060',
  toastBg: '#2A2A3E',
  errorBg: '#3D1A1A',
  warningBg: '#3D2A1A',
  successBg: 'rgba(61,139,99,0.15)',

  // ── Convenience ──
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorPalette = typeof lightColors;

// Default export for backward compatibility — screens that haven't migrated
// to useTheme() yet will still see the light palette.
export const colors = lightColors;
