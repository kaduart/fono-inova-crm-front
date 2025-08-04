import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDevelopment = mode === 'development';

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
          target: isDevelopment 
            ? 'http://localhost:5000' // Backend local em desenvolvimento
            : 'https://fono-inova-crm-back.onrender.com', // Backend remoto em produção
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: !isDevelopment, // Desativa verificação SSL em desenvolvimento
          configure: (proxy) => {
            // Opcional: Configurações adicionais do proxy
            proxy.on('error', (err) => {
              console.error('Proxy error:', err);
            });
          }
        }
      }
    },
    define: {
      'process.env': {
        VITE_USE_LOCAL_API: JSON.stringify(env.VITE_USE_LOCAL_API),
        VITE_API_URL: JSON.stringify(
          isDevelopment 
            ? 'http://localhost:5000/api' 
            : 'https://fono-inova-crm-back.onrender.com/api'
        )
      }
    }
  };
});