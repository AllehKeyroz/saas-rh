import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  logLevel: 'error',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    allowedHosts: 'all',
  },
})
