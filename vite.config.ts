import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDevelopment = mode === 'development';
  const baseUrl = env.VITE_API_BASE_URL || 
    (isDevelopment 
      ? 'http://localhost:5000' 
      : 'https://fono-inova-crm-back.onrender.com');

  return {
    base: '/', // Adicionado para garantir rotas absolutas
    plugins: [
      react(),
      ...(mode === 'production' ? [visualizer({
        open: true,
        gzipSize: true,
        filename: 'bundle-stats.html'
      })] : [])
    ],
    build: {
      outDir: '../backend/frontend/dist', // Caminho absoluto recomendado
      emptyOutDir: true,
      sourcemap: isDevelopment,
      rollupOptions: {
        output: {
          manualChunks: {
            mui: ['@mui/material', '@mui/icons-material'],
            react: ['react', 'react-dom', 'react-router-dom'],
            vendors: ['lodash', 'date-fns', 'axios'],
            charts: ['recharts', 'chart.js']
          },
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`
        }
      },
      chunkSizeWarningLimit: 1600,
      minify: isDevelopment ? false : 'terser'
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: baseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: !isDevelopment,
          ws: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              console.log('[PROXY]', proxyReq.method, proxyReq.path);
            });
          }
        }
      }
    },
    preview: {
      port: 4173,
      host: true,
      proxy: {
        '/api': {
          target: baseUrl,
          changeOrigin: true,
          secure: true
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '~': path.resolve(__dirname, './public')
      }
    },
    define: {
      'process.env': {
        VITE_API_BASE_URL: JSON.stringify(`${baseUrl}/api`),
        VITE_MODE: JSON.stringify(mode),
        VITE_BUILD_TIME: JSON.stringify(new Date().toISOString())
      }
    }
  };
});