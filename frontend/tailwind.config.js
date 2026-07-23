export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0C3D5E',
          hover: '#0A3350',
          light: '#E8F3F9',
        },
        accent: {
          DEFAULT: '#F0A500',
          hover: '#D4920A',
          light: '#FEF6E4',
        },
        neutral: {
          50: '#F7F9FC',
          100: '#EEF2F7',
          200: '#DDE3EC',
          300: '#C4CEE0',
          400: '#8D9CBD',
          500: '#5B6B8A',
          600: '#3D4F6E',
          700: '#28364F',
          800: '#172135',
          900: '#0C1524',
        },
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '24px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(12,61,94,0.04)',
        sm: '0 1px 3px rgba(12,61,94,0.08), 0 1px 2px rgba(12,61,94,0.04)',
        DEFAULT: '0 4px 6px rgba(12,61,94,0.06), 0 2px 4px rgba(12,61,94,0.04)',
        md: '0 4px 6px rgba(12,61,94,0.06), 0 2px 4px rgba(12,61,94,0.04)',
        lg: '0 10px 15px rgba(12,61,94,0.08), 0 4px 6px rgba(12,61,94,0.04)',
        xl: '0 20px 25px rgba(12,61,94,0.10), 0 10px 10px rgba(12,61,94,0.04)',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'fade-in': 'fadeIn 0.3s ease forwards',
        shimmer: 'shimmer 1.8s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
    },
  },
  plugins: [],
};
