<template>
  <div class="fixed z-50 pointer-events-none">
    <!-- Desktop: Top-right notifications -->
    <div class="hidden md:block top-4 right-4 fixed">
      <TransitionGroup name="alert-list" tag="div" class="space-y-2">
        <div
          v-for="alert in alertStore.alerts"
          :key="alert.id"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 w-96 pointer-events-auto border-l-4"
          :class="getAlertBorderColor(alert.type)"
          role="alert"
          aria-live="assertive"
        >
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 text-2xl" aria-hidden="true">
              {{ getAlertIcon(alert.type) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ alert.title }}
              </p>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {{ alert.message }}
              </p>
              <p v-if="alert.location" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                📍 {{ alert.location }}
              </p>
            </div>
            <button
              @click="alertStore.dismissAlert(alert.id)"
              class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Mobile: Bottom-up notifications (above bottom nav) -->
    <div class="md:hidden fixed bottom-0 left-0 right-0 pb-20">
      <TransitionGroup name="alert-mobile" tag="div" class="space-y-2 px-4">
        <div
          v-for="alert in alertStore.alerts"
          :key="alert.id"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 pointer-events-auto border-l-4"
          :class="getAlertBorderColor(alert.type)"
          role="alert"
          aria-live="assertive"
        >
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 text-2xl" aria-hidden="true">
              {{ getAlertIcon(alert.type) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ alert.title }}
              </p>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {{ alert.message }}
              </p>
              <p v-if="alert.location" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                📍 {{ alert.location }}
              </p>
            </div>
            <button
              @click="alertStore.dismissAlert(alert.id)"
              class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -mt-2"
              aria-label="Dismiss notification"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { useAlertStore } from '@/stores/alerts'

const alertStore = useAlertStore()

function getAlertIcon(type) {
  const icons = {
    reminder: '🔔',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  }
  return icons[type] || '📅'
}

function getAlertBorderColor(type) {
  const colors = {
    reminder: 'border-blue-500',
    success: 'border-green-500',
    warning: 'border-yellow-500',
    error: 'border-red-500',
    info: 'border-indigo-500'
  }
  return colors[type] || 'border-gray-500'
}
</script>

<style scoped>
/* Desktop alert animations */
.alert-list-enter-active,
.alert-list-leave-active {
  transition: all 0.3s ease;
}

.alert-list-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.alert-list-leave-to {
  opacity: 0;
  transform: translateX(100px) scale(0.9);
}

.alert-list-move {
  transition: transform 0.3s ease;
}

/* Mobile alert animations */
.alert-mobile-enter-active,
.alert-mobile-leave-active {
  transition: all 0.3s ease;
}

.alert-mobile-enter-from {
  opacity: 0;
  transform: translateY(100px);
}

.alert-mobile-leave-to {
  opacity: 0;
  transform: translateY(100px) scale(0.9);
}

.alert-mobile-move {
  transition: transform 0.3s ease;
}
</style>
