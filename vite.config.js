import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/GYMBook/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'برنامه ورزشی GYMBook',
        short_name: 'GYMBook',
        start_url: '/GYMBook/',
        display: 'standalone',
        theme_color: '#0f172a',
        icons: [
          { src: '/GYMBook/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/GYMBook/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
