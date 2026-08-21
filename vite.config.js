import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}']
  },
  plugins: [
    vue(),
    VitePWA({
      // 'prompt', not 'autoUpdate': the app registers the worker itself in
      // src/services/registerServiceWorker.js and offers the update as a
      // banner and a settings row, so nobody has to hard-refresh — and no
      // reload happens mid-sentence either.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: [
        'icon-192x192.svg',
        'icon-512x512.svg',
        'icon-192x192.png',
        'icon-512x512.png',
        'apple-touch-icon.png'
      ],
      manifest: {
        name: 'Birth Calendar',
        short_name: 'Birth',
        description:
          'A 280-day companion for pregnancy — a declaration and a prayer for every day, with a calendar for the rest of life alongside it',
        theme_color: '#c9788a',
        background_color: '#fdf2f4',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        // PNG first: Chrome's installability check is happiest with raster
        // icons at 192 and 512, and several platforms will not use an SVG at
        // all. The SVGs stay for anything that prefers them.
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ],
        categories: ['lifestyle', 'health', 'productivity'],
        // The birth calendar is what the app opens on now, so the shortcuts
        // lead there; `?calendar=` overrides the saved default for one launch.
        shortcuts: [
          {
            name: "Today's declaration",
            short_name: 'Today',
            description: "Read today's declaration and prayer",
            url: '/?calendar=birth',
            icons: [{ src: '/icon-192x192.svg', sizes: '192x192' }]
          },
          {
            name: 'My calendar',
            short_name: 'Calendar',
            description: 'Events, reminders and the rest of life',
            url: '/?calendar=standard',
            icons: [{ src: '/icon-192x192.svg', sizes: '192x192' }]
          }
        ]
      }
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(new Date().toISOString())
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
