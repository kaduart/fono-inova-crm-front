import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';
  
  // Configuração mínima de URLs
  const baseUrl = isDev 
    ? 'http://localhost:5000' 
    : env.VITE_API_BASE_URL || 'https://fono-inova-crm-back.onrender.com';

  return {
    base: '/',
    plugins: [react()], // Apenas o plugin básico do React
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            mui: ['@mui/material', '@mui/icons-material'],
            react: ['react', 'react-dom', 'react-router-dom']
          }
        }
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: baseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      'process.env.VITE_API_BASE_URL': JSON.stringify(baseUrl)
    }
  };
});