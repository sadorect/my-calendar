import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192x192.svg', 'icon-512x512.svg'],
      manifest: {
        name: 'Personal Calendar',
        short_name: 'Calendar',
        description: 'A comprehensive personal productivity calendar with smart features',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        categories: ['productivity', 'utilities', 'lifestyle'],
        shortcuts: [
          {
            name: 'Add Event',
            short_name: 'Add Event',
            description: 'Quickly add a new event',
            url: '/?action=add',
            icons: [{ src: '/icon-192x192.svg', sizes: '192x192' }]
          },
          {
            name: "Today's Events",
            short_name: 'Today',
            description: "View today's events",
            url: '/?view=today',
            icons: [{ src: '/icon-192x192.svg', sizes: '192x192' }]
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
