import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import './style.css'
import { useThemeStore } from './stores/theme'
import { listenForInstallPrompt } from './composables/useShareApp.js'

// Chrome fires `beforeinstallprompt` once and early — often before anything has
// mounted — so the listener goes on before the app does.
listenForInstallPrompt()

const app = createApp(App)

app.use(createPinia())

// Initialize theme store to apply initial theme
useThemeStore()

app.mount('#app')
