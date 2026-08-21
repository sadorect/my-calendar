<script setup>
import { ref } from 'vue'
import { useAppUpdate } from '../composables/useAppUpdate.js'

const { updateReady, installUpdate } = useAppUpdate()
const dismissed = ref(false)
const installing = ref(false)

async function update() {
  installing.value = true
  await installUpdate()
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300"
    enter-from-class="opacity-0 translate-y-3"
    leave-active-class="transition duration-200"
    leave-to-class="opacity-0 translate-y-3"
  >
    <div
      v-if="updateReady && !dismissed"
      class="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl bg-neutral-900 text-white shadow-2xl p-4 flex items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <span class="text-lg" aria-hidden="true">✨</span>
      <p class="text-sm flex-1 leading-snug">
        A new version is ready.
        <span class="block text-white/60">Your saved data stays exactly as it is.</span>
      </p>
      <button
        class="shrink-0 px-3 py-2 rounded-xl bg-white text-neutral-900 text-sm font-medium hover:bg-white/90 transition disabled:opacity-60"
        style="min-height: 44px"
        :disabled="installing"
        @click="update"
      >
        {{ installing ? 'Updating…' : 'Update now' }}
      </button>
      <button
        class="shrink-0 w-9 h-9 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
        aria-label="Not now"
        @click="dismissed = true"
      >
        ✕
      </button>
    </div>
  </Transition>
</template>
