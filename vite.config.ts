import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  // Configuração explícita de URLs por ambiente
  const getApiBaseUrl = () => {
    if (env.VITE_API_BASE_URL) return env.VITE_API_BASE_URL;
    return isDev ? 'http://localhost:5000' : 'https://fono-inova-crm-back.onrender.com';
  };

  const getFrontendUrl = () => {
    if (env.VITE_FRONTEND_URL) return env.VITE_FRONTEND_URL;
    return isDev ? 'http://localhost:5173' : 'https://seu-app.vercel.app';
  };

  const baseUrl = getApiBaseUrl();
  const frontendUrl = getFrontendUrl();

  return {
    base: '/',
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
      sourcemap: isDev,
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
        }
      },
      chunkSizeWarningLimit: 2000,
      minify: isDev ? false : 'esbuild',
      terserOptions: {
        compress: {
          drop_console: !isDev
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
          secure: false,
          ws: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('X-Forwarded-Host', new URL(frontendUrl).host);
              proxyReq.setHeader('X-Forwarded-Proto', new URL(frontendUrl).protocol.replace(':', ''));
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
        VITE_API_BASE_URL: JSON.stringify(baseUrl),
        VITE_FRONTEND_URL: JSON.stringify(frontendUrl),
        VITE_MODE: JSON.stringify(mode),
        VITE_BUILD_TIME: JSON.stringify(new Date().toISOString())
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@emotion/react'
      ],
      force: isDev
    }
  };
});