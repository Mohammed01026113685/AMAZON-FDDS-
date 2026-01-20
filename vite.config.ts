
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
          charts: ['chart.js', 'react-chartjs-2'],
          excel: ['exceljs', 'xlsx'],
          pdf: ['jspdf', 'html2canvas']
        }
      }
    }
  }
});
