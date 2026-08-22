import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import './style.css'
import { useThemeStore } from './stores/theme'
import { listenForInstallPrompt } from './composables/useShareApp.js'
import { registerServiceWorker } from './services/registerServiceWorker.js'
import { inject as injectVercelAnalytics } from '@vercel/analytics'

// Chrome fires `beforeinstallprompt` once and early — often before anything has
// mounted — so the listener goes on before the app does.
listenForInstallPrompt()

// Owns the service worker so updates can be offered in the UI instead of
// arriving only after a hard refresh.
registerServiceWorker()

// Traffic only — page views, no cookies, no identifiers, and nothing about what
// happens inside the app. Everything a person writes here stays on their device.
injectVercelAnalytics({ mode: import.meta.env.PROD ? 'production' : 'development' })

const app = createApp(App)

app.use(createPinia())

// Initialize theme store to apply initial theme
useThemeStore()

app.mount('#app')
