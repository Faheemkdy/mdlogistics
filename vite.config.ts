import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-xlsx': ['xlsx'],
          'vendor-date': ['date-fns'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
});
