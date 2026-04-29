import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react', 'react-hot-toast', 'date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/v1': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
