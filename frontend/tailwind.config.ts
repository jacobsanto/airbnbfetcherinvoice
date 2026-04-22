import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#FF5A5F', hover: '#E04E53' },
      },
    },
  },
  plugins: [],
} satisfies Config;
