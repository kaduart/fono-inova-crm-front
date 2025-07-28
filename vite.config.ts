import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

// Configuração mínima para fazer o build funcionar
export default defineConfig({
  plugins: [
    react(), 
      visualizer({
      open: true,
      gzipSize: true
    })],
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
}
})