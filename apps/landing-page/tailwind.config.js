/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        red: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
          // Brand primaries
          brand: '#E8192C',
          dark:  '#B01020',
          deep:  '#7F0B18',
        },
      },
      animation: {
        'fade-up':    'fadeUp 0.6s ease forwards',
        'fade-in':    'fadeIn 0.5s ease forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':      'float 6s ease-in-out infinite',
        'grain':      'grain 0.8s steps(1) infinite',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        'twinkle':    'twinkle 3s ease-in-out infinite',
        'scan':       'scan 8s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-22px)' },
        },
        grain: {
          '0%':         { transform: 'translate(0,   0)' },
          '10%':        { transform: 'translate(-2%, -3%)' },
          '20%':        { transform: 'translate(3%,  2%)' },
          '30%':        { transform: 'translate(-1%, 4%)' },
          '40%':        { transform: 'translate(4%, -1%)' },
          '50%':        { transform: 'translate(-3%, 3%)' },
          '60%':        { transform: 'translate(2%, -4%)' },
          '70%':        { transform: 'translate(-4%, 2%)' },
          '80%':        { transform: 'translate(1%, -2%)' },
          '90%':        { transform: 'translate(3%,  4%)' },
          '100%':       { transform: 'translate(0,   0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.12' },
          '50%':      { opacity: '0.25' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0', transform: 'scale(0.8)' },
          '50%':      { opacity: '0.7', transform: 'scale(1.2)' },
        },
        scan: {
          '0%':   { transform: 'translateY(-10px)', opacity: '0' },
          '5%':   { opacity: '1' },
          '90%':  { opacity: '0.6' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
