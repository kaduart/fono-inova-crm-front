import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

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
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      sourcemap: isDevelopment,
      rollupOptions: {
        output: {
          manualChunks: {
            mui: ['@mui/material', '@mui/icons-material'],
            react: ['react', 'react-dom', 'react-router-dom'],
            vendors: ['lodash', 'date-fns', 'axios'],
          },
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`
        },
        input: {
          main: './index.html'
        }
      },
      chunkSizeWarningLimit: 1600,
      minify: isDevelopment ? false : 'esbuild'
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
        '~': path.resolve(__dirname, './public'),
        'chart.js': path.resolve(__dirname, 'node_modules/chart.js')
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