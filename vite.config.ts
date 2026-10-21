import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    // SW UPDATE: autoUpdate means new deploy auto-refreshes cached app
    registerType: 'autoUpdate',
    manifest: {
      name: 'Dukaan Saathi', short_name: 'Dukaan', theme_color: '#16a34a',
      background_color: '#ffffff', display: 'standalone',
      icons: [{ src: '/icon.png', sizes: '192x192', type: 'image/png' }],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] },
  })],
})
