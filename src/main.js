import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import './style.css'
import { registerServiceWorker } from './services/pwa'
import { useThemeStore } from './stores/theme'

const app = createApp(App)

app.use(createPinia())

// Initialize theme store to apply initial theme
const themeStore = useThemeStore()

app.mount('#app')

// Register service worker for PWA functionality
registerServiceWorker()
