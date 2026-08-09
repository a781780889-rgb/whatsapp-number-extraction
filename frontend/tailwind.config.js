/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cairo"', '"IBM Plex Sans Arabic"', 'sans-serif'],
        body: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#070A0F',
          900: '#0A0E14',
          850: '#0D131B',
          800: '#121A24',
          700: '#1A2430',
          600: '#26313F',
          500: '#3A4757',
        },
        paper: {
          50: '#FAF8F4',
          100: '#F3F0E9',
          200: '#E8E3D8',
        },
        amber: {
          DEFAULT: '#EFA23C',
          50: '#FDF3E4',
          100: '#FBE7C9',
          300: '#F4C179',
          400: '#F1B15C',
          500: '#EFA23C',
          600: '#D68526',
          700: '#B0691B',
        },
        emerald: {
          DEFAULT: '#33C48C',
          50: '#E6FBF3',
          300: '#7DE3BB',
          400: '#54D6A5',
          500: '#33C48C',
          600: '#22A171',
        },
        rose: {
          DEFAULT: '#F0526C',
          50: '#FDE9EC',
          300: '#F6A2B1',
          400: '#F37A8E',
          500: '#F0526C',
          600: '#D22F4A',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.28)',
        'glass-lg': '0 20px 60px -12px rgba(0, 0, 0, 0.45)',
        glow: '0 0 0 1px rgba(239, 162, 60, 0.15), 0 0 24px -4px rgba(239, 162, 60, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
