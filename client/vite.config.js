import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build', // Maintain 'build' folder for compatibility with existing deployment scripts
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('jszip')) {
              return 'vendor-zip';
            }
            if (id.includes('xlsx')) {
              return 'vendor-excel';
            }
            if (id.includes('posthog-js')) {
              return 'vendor-posthog';
            }
            if (id.includes('@sentry')) {
              return 'vendor-sentry';
            }
            if (id.includes('react-rnd') || id.includes('re-resizable') || id.includes('react-draggable')) {
              return 'vendor-rnd';
            }
            if (id.includes('libphonenumber-js') || id.includes('react-phone-input-2')) {
              return 'vendor-phone';
            }
            if (id.includes('axios') || id.includes('file-saver') || id.includes('zustand') || id.includes('react-hot-toast') || id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-utils';
            }
            if (id.includes('react-dropzone')) {
              return 'vendor-upload';
            }
            return 'vendor-others';
          }
        },
      },
    },
  },
});
