import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#8B3A4A',
        'primary-dark': '#6B1D2A',
        accent: '#B5956B',
        surface: '#FFFFFF',
        background: '#FAFAF7',
        'text-primary': '#1A1A1A',
        'text-secondary': '#6B6B6B',
        'text-tertiary': '#999999',
        border: '#EEEEEE',
        success: '#3D8B63',
        warning: '#D4923A',
        error: '#C44A4A',
        whatsapp: '#25D366',
        // Mockup tokens
        'surface-container': '#EEEEEB',
        'surface-container-low': '#F4F4F1',
        'surface-container-high': '#E8E8E5',
        outline: '#877274',
        'on-surface-variant': '#544244',
        'secondary-container': '#FFDAAB',
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
