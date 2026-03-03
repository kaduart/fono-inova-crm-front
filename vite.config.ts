import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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
    : env.VITE_FRONTEND_URL || 'https://app.clinicafonoinova.com.br';

  return {
    base: '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'images/*.png'],
        manifest: {
          name: 'Fono Inova - CRM Clínica',
          short_name: 'Fono Inova',
          description: 'Sistema de gestão da Clínica Fono Inova',
          theme_color: '#059669',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'images/logo-padrao-3d-longa.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'images/logo-padrao-3d-longa.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fono-inova-crm-back\.onrender\.com\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks - bibliotecas grandes que mudam pouco
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            'vendor-charts': ['recharts', 'chart.js', 'react-chartjs-2'],
            'vendor-calendar': ['@fullcalendar/core', '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction'],
            'vendor-forms': ['react-hook-form', 'zod'],
            'vendor-utils': ['axios', 'date-fns', 'dayjs', 'moment', 'moment-timezone'],
            'vendor-ui': ['framer-motion', 'lucide-react', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],

            // Dynamic imports para features pesadas
            'feature-analytics': ['./src/components/Dashboard/SiteAnalyticsDashboard.tsx', './src/components/Dashboard/AnalyticsDashboard.tsx'],
            'feature-calendar': ['./src/components/calendar/EnhancedCalendar.tsx'],
            'feature-chat': ['./src/components/mkt/whatsapp/AppChat.tsx', './src/components/mkt/whatsapp/ContactsPage.tsx'],
            'feature-financial': ['./src/pages/Financial/FinancialDashboard.tsx', './src/components/financial/PaymentPage.tsx'],
            'feature-doctors': ['./src/components/ManageDoctors/ManageDoctors.tsx', './src/components/ManageDoctors/DoctorAgenda.tsx']
          },
          chunkFileNames: (chunkInfo) => {
            // Nomear chunks de forma previsível para debugging
            const name = chunkInfo.name || 'chunk';
            if (name.startsWith('vendor-')) {
              return `assets/vendor/[name]-[hash].js`;
            }
            if (name.startsWith('feature-')) {
              return `assets/features/[name]-[hash].js`;
            }
            return `assets/[name]-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name || '';
            if (info.endsWith('.css')) {
              return 'assets/styles/[name]-[hash][extname]';
            }
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(info)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/\.(woff2?|ttf|otf|eot)$/.test(info)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          }
        }
      },
      // Otimizações de build
      minify: 'esbuild',
      sourcemap: false, // Desabilitar em produção para builds menores
      reportCompressedSize: false // Desabilitar relatório para builds mais rápidos
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: baseUrl,
          changeOrigin: true,
          rewrite: (path) => path,
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