/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#39FF14',
          red: '#FF073A',
          blue: '#04D9FF',
          purple: '#BC13FE',
        },
        surface: {
          950: '#06060a',
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#252530',
        },
      },
      boxShadow: {
        'neon-green': '0 0 5px #39FF14, 0 0 20px #39FF1444',
        'neon-red': '0 0 5px #FF073A, 0 0 20px #FF073A44',
        'neon-blue': '0 0 5px #04D9FF, 0 0 20px #04D9FF44',
        'neon-purple': '0 0 5px #BC13FE, 0 0 20px #BC13FE44',
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 40px currentColor' },
        },
      },
    },
  },
  plugins: [],
};
