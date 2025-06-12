import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const backendUrl = process.env.VITE_BACKEND_URL;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/admin': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/send_warning': {
        target: backendUrl,
        changeOrigin: true,
      }
    }
  }
});
