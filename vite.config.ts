import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do arquivo correspondente
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      visualizer({
        open: true,
        gzipSize: true
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            mui: ['@mui/material'],
            react: ['react', 'react-dom', 'react-router-dom'],
            vendor: ['lodash', 'date-fns', 'axios']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    server: {
     proxy: {
      '/api': {
        target: 'https://fono-inova-crm-back.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        }
      }
    },
    define: {
      'process.env': {
        VITE_USE_LOCAL_API: env.VITE_USE_LOCAL_API,
        VITE_API_URL: env.VITE_API_URL
      }
    }
  }
}
});