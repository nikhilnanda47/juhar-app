/**
 * Spacing, border radius, and elevation — UI Specification v2.0
 */
export const spacing = {
  xs: 4,       // Tight gaps — badge padding, inline icon spacing
  sm: 8,       // Small gaps — icon + text, label above input
  md: 16,      // Standard — screen margins, gap between elements
  lg: 24,      // Section padding, card internal padding
  xl: 32,      // Gap between sections
  xxl: 48,     // Major section breaks
  gutter: 12,  // Product grid gap between cards
  margin: 16,  // Screen margins (both sides)
} as const;

export const borderRadius = {
  sm: 6,       // Inputs, small buttons
  md: 12,      // Cards, modals, product images
  lg: 16,      // Bottom sheets, large containers
  full: 9999,  // Pills, badges, avatars, stepper buttons, color swatches
} as const;

export const elevation = {
  /** Default for cards, list items, inputs */
  hairline: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  /** Floating elements: sticky bars, bottom sheets */
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  /** No border, no shadow */
  none: {},
} as const;
