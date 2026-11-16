/**
 * Sajani color palette — UI Specification v2.0
 * Soft Burgundy + Warm Bronze, clean/minimal design system.
 */
export const colors = {
  // ── Brand ──
  primary: '#8B3A4A',         // Soft Burgundy — CTAs, active states (max 2 per screen)
  primaryDark: '#6B1D2A',     // Deep Burgundy — pressed/hover states
  accent: '#B5956B',          // Warm Bronze — prices, highlights, subtle badges

  // ── Neutrals ──
  background: '#FAFAF7',      // App background — warm off-white
  surface: '#FFFFFF',         // Cards, inputs, modals
  textPrimary: '#1A1A1A',    // Headings, product names
  textSecondary: '#6B6B6B',  // Descriptions, metadata
  textTertiary: '#999999',   // Timestamps, hints, placeholders
  border: '#EEEEEE',         // Hairline dividers, card borders

  // ── Functional ──
  success: '#3D8B63',         // Muted green — in stock, delivered, confirmed
  warning: '#D4923A',         // Muted amber — low stock, pending
  error: '#C44A4A',           // Muted red — out of stock, errors, cancelled

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
  wishlistActive: '#C44A4A',  // Filled heart color

  // ── Convenience ──
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;
