import type { Config } from 'tailwindcss';

function cssVar(name: string) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: cssVar('primary'),
        'primary-dark': cssVar('primary-dark'),
        accent: cssVar('accent'),
        surface: cssVar('surface'),
        background: cssVar('background'),
        'text-primary': cssVar('text-primary'),
        'text-secondary': cssVar('text-secondary'),
        'text-tertiary': cssVar('text-tertiary'),
        border: cssVar('border'),
        success: cssVar('success'),
        warning: cssVar('warning'),
        error: cssVar('error'),
        whatsapp: cssVar('whatsapp'),
        'surface-container': cssVar('surface-container'),
        'surface-container-low': cssVar('surface-container-low'),
        'surface-container-high': cssVar('surface-container-high'),
        outline: cssVar('outline'),
        'on-surface-variant': cssVar('on-surface-variant'),
        'secondary-container': cssVar('secondary-container'),
        'accent-dark': cssVar('accent-dark'),
        'toast-bg': cssVar('toast-bg'),
        'status-delivered-bg': cssVar('status-delivered-bg'),
        'status-delivered-text': cssVar('status-delivered-text'),
        'status-confirmed-bg': cssVar('status-confirmed-bg'),
        'status-confirmed-text': cssVar('status-confirmed-text'),
        'status-packed-bg': cssVar('status-packed-bg'),
        'status-packed-text': cssVar('status-packed-text'),
        'status-cancelled-bg': cssVar('status-cancelled-bg'),
        'status-cancelled-text': cssVar('status-cancelled-text'),
      },
      fontFamily: {
        serif: ['Noto Serif', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'headline-xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '400' }],
        'headline-lg-mobile': ['22px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '400' }],
        'headline-md': ['20px', { lineHeight: '26px', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'title-sm': ['16px', { lineHeight: '22px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'label-md': ['13px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.06em', fontWeight: '600' }],
        'price-lg': ['20px', { lineHeight: '26px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'price-md': ['16px', { lineHeight: '22px', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        gutter: '0.75rem',
        'space-md': '1rem',
        margin: '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
      maxWidth: {
        mobile: '430px',
        content: '1440px',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
