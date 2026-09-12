<script setup>
import { computed } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'

/**
 * The floating way into the prayer journal.
 *
 * The twin of the "← Calendar" pill in App.vue — same fixed top row, same
 * glass treatment, sitting just to its left — because the journal is not a
 * tab: every tab is scoped to the active child and the journal spans the whole
 * family. The top row is the one place nothing else ever occupies.
 */
const store = usePregnancyStore()

defineProps({
  active: { type: Boolean, default: false }
})
const emit = defineEmits(['open'])

const label = computed(() => {
  const n = store.openPrayerCount
  if (!n) return 'Prayers'
  return `${n} praying`
})
</script>

<template>
  <button
    type="button"
    class="fixed top-3 z-40 flex items-center gap-1.5 pl-2.5 pr-3 py-2 rounded-full text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/35"
    :class="active ? 'bg-black/45' : 'bg-black/25'"
    style="min-height: 44px; right: 7.25rem"
    aria-label="Open the prayer journal"
    data-testid="prayer-card"
    @click="emit('open')"
  >
    <!-- Praying hands, in the same 1.5-stroke key as the tab glyphs. -->
    <svg
      class="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <!-- Two palms meeting, fingertips up. -->
      <path
        d="M12 3.75c2.8 2.6 4.75 6.1 4.75 9.75 0 3.2-2 5.9-4.75 7.25-2.75-1.35-4.75-4.05-4.75-7.25 0-3.65 1.95-7.15 4.75-9.75Z"
      />
      <path d="M12 3.75v17" />
    </svg>
    <span>{{ label }}</span>
  </button>
</template>
