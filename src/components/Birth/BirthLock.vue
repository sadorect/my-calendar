<script setup>
import { onMounted, ref } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'

const store = usePregnancyStore()
const busy = ref(false)

async function attempt() {
  busy.value = true
  await store.unlock()
  busy.value = false
}

// Prompt immediately: making someone tap a button before the Face ID sheet is
// an extra step for no benefit on the common path.
onMounted(attempt)
</script>

<template>
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center px-6"
    :style="{ backgroundImage: 'linear-gradient(170deg, var(--bc-from), var(--bc-to))' }"
    role="dialog"
    aria-modal="true"
    aria-label="Locked"
  >
    <div class="text-center max-w-xs">
      <div
        class="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
        :style="{ backgroundColor: 'var(--bc-accent)' }"
        aria-hidden="true"
      >
        <svg
          class="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M6.75 10.5h10.5a2.25 2.25 0 012.25 2.25v6a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25v-6a2.25 2.25 0 012.25-2.25z"
          />
        </svg>
      </div>

      <h1 class="font-serif text-2xl mb-2">Locked</h1>
      <p class="bc-muted text-sm leading-relaxed mb-6">
        Your notes and declarations are private. Unlock with your device to continue.
      </p>

      <p
        v-if="store.lockError"
        class="text-sm mb-4"
        :style="{ color: 'var(--bc-accent)' }"
        role="alert"
      >
        {{ store.lockError }}
      </p>

      <button
        class="bc-tap w-full px-4 py-3 rounded-xl text-white font-medium transition disabled:opacity-60"
        :style="{ backgroundColor: 'var(--bc-accent)' }"
        :disabled="busy"
        @click="attempt"
      >
        {{ busy ? 'Waiting…' : 'Unlock' }}
      </button>
    </div>
  </div>
</template>
