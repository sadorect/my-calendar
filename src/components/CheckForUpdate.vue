<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useAppUpdate } from '../composables/useAppUpdate.js'

const props = defineProps({
  /**
   * menu — full-width row for the mobile "More" sheet
   * card — labelled section for a settings screen
   */
  variant: { type: String, default: 'card' }
})

const { updateReady, checking, note, buildLabel, checkForUpdate, installUpdate } = useAppUpdate()

const label = computed(() => {
  if (updateReady.value) return 'Update now'
  return checking.value ? 'Checking…' : 'Check for updates'
})

// The menu row has no room for a second line, so the outcome of a check is
// shown as the label itself and then fades back — otherwise tapping it looks
// like nothing happened.
const flash = ref('')
let flashTimer = null
watch(note, (value) => {
  clearTimeout(flashTimer)
  flash.value = value
  if (value) flashTimer = setTimeout(() => (flash.value = ''), 6000)
})
onBeforeUnmount(() => clearTimeout(flashTimer))

const menuLabel = computed(() => (!updateReady.value && flash.value ? flash.value : label.value))

function activate() {
  return updateReady.value ? installUpdate() : checkForUpdate()
}
</script>

<template>
  <!-- Mobile "More" sheet -->
  <button
    v-if="props.variant === 'menu'"
    class="w-full text-left p-4 rounded-2xl hover:bg-theme-secondary transition-colors flex items-center space-x-3"
    :disabled="checking"
    @click="activate"
  >
    <span class="text-lg" aria-hidden="true">{{ updateReady ? '✨' : '🔄' }}</span>
    <span class="font-medium">{{ menuLabel }}</span>
  </button>

  <!-- Settings-style card -->
  <section v-else class="bc-card p-5">
    <h2 class="font-medium mb-1">App version</h2>
    <p class="text-sm bc-muted mb-3">
      {{
        updateReady
          ? 'A new version is ready to install.'
          : 'The app updates itself in the background. Tap below to look for a new version now.'
      }}
    </p>
    <button
      class="px-4 py-2.5 rounded-xl text-sm font-medium border transition hover:opacity-90 disabled:opacity-60"
      :style="
        updateReady
          ? { background: 'var(--bc-accent)', color: '#fff', borderColor: 'var(--bc-accent)' }
          : { borderColor: 'var(--bc-hairline)' }
      "
      style="min-height: 44px"
      :disabled="checking"
      @click="activate"
    >
      {{ label }}
    </button>
    <p v-if="note" class="text-xs bc-muted mt-3">{{ note }}</p>
    <p v-if="buildLabel" class="text-xs bc-muted mt-2">{{ buildLabel }}</p>
  </section>
</template>
