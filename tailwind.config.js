/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Scripture and declarations are set in a serif; UI stays sans. Both are
        // system stacks so the app still loads instantly offline and makes no
        // webfont request.
        serif: ['Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', 'ui-serif', 'serif'],
      },
      typography: {},
      keyframes: {
        'gentle-rise': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-fade': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        drift: {
          '0%': { opacity: '0', transform: 'translateY(0) scale(0.8)' },
          '20%': { opacity: '0.7' },
          '100%': { opacity: '0', transform: 'translateY(-120px) scale(1.15)' },
        },
      },
      animation: {
        'gentle-rise': 'gentle-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'soft-fade': 'soft-fade 0.6s ease-out both',
        drift: 'drift 4s ease-out forwards',
      },
    }
  },
  plugins: []
}
