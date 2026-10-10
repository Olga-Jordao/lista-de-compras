/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// O endereço no GitHub Pages é /lista-de-compras/.
export default defineConfig({
  base: '/lista-de-compras/',
  // A biblioteca do Supabase é grande; como fica guardada no telemóvel, não faz mal.
  build: { chunkSizeWarningLimit: 1000 },
  // Versão = data e hora da publicação, para se ver no ecrã Sincronizar qual está instalada.
  define: {
    __VERSAO__: JSON.stringify(
      new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', dateStyle: 'short', timeStyle: 'short' }),
    ),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Lista de Compras',
        short_name: 'Compras',
        description: 'A minha lista de compras',
        lang: 'pt-PT',
        start_url: '/lista-de-compras/',
        scope: '/lista-de-compras/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#06152e',
        theme_color: '#06152e',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: '/lista-de-compras/index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
