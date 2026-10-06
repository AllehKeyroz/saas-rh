import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  logLevel: 'error',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    // PWA instalável (Android/iOS). Sem cache/offline: todas as requisições
    // vão sempre para a rede (NetworkOnly) — o app só funciona online.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'RHDTalia — Sistema de RH',
        short_name: 'RHDTalia',
        description: 'Gestão de RH, férias, comissões e portal do funcionário.',
        lang: 'pt-BR',
        theme_color: '#5A64A2',
        background_color: '#5A64A2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Sem precache e sem fallback offline: nada é servido do cache.
        globPatterns: [],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    allowedHosts: 'all',
  },
})
