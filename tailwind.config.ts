import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: '#071426',
        navyBlue: '#0B1F3A',
        navyMid: '#123057',
        royalBlue: '#2563EB',
        cyanAccent: '#22D3EE',
        tealAccent: '#14B8A6',
        goldAccent: '#C9A44C',
        goldLight: '#D7B968',
        goldPale: '#F6EEDB',
        bgLight: '#F6F7F9',
        surfaceWhite: '#FFFFFF',
        textPrimary: '#101828',
        textSecondary: '#667085',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 16px 38px -24px rgba(7, 20, 38, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config;
