import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  // Configuração robusta de URLs
  const baseUrl = isDev
    ? 'http://localhost:5000'
    : env.VITE_API_BASE_URL || 'https://fono-inova-crm-back.onrender.com';

  const frontendUrl = isDev
    ? 'http://localhost:5173'
    : env.VITE_FRONTEND_URL || 'https://seu-app.vercel.app';

  return {
    base: '/',
    plugins: [react()],
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            mui: ['@mui/material', '@mui/icons-material'],
            react: ['react', 'react-dom', 'react-router-dom']
          },
          chunkFileNames: 'assets/[name]-[hash].js'
        }
      }
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: baseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: {
            'X-Forwarded-Host': new URL(frontendUrl).host
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      'process.env': {
        VITE_API_BASE_URL: JSON.stringify(baseUrl),
        VITE_FRONTEND_URL: JSON.stringify(frontendUrl) // Adição crucial
      }
    }
  };
});