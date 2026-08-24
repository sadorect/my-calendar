<script setup>
import { computed } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'

const store = usePregnancyStore()

/**
 * Hidden entirely for a household with one child.
 *
 * This is the whole promise of the migration: someone who only ever wanted the
 * pregnancy calendar must not be shown a switcher, a stage or anything else
 * that implies the app has grown a concept they did not ask for.
 */
const show = computed(() => store.profiles.length > 1)

/** The initial in the pill, for a child whose name has not been set yet. */
function initial(profile) {
  const name = profile.name?.trim()
  return name ? name[0].toUpperCase() : profile.kind === 'womb' ? '♡' : '·'
}

function label(profile) {
  return profile.name?.trim() || (profile.kind === 'womb' ? 'Little one' : 'Unnamed')
}
</script>

<template>
  <nav v-if="show" class="px-5 pt-1 pb-3 max-w-2xl mx-auto" aria-label="Choose a child">
    <ul class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
      <li v-for="profile in store.profiles" :key="profile.id" class="shrink-0">
        <button
          class="bc-tap flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-sm font-medium border transition"
          :aria-current="profile.id === store.activeProfile?.id ? 'true' : undefined"
          :style="
            profile.id === store.activeProfile?.id
              ? {
                  backgroundColor: 'var(--bc-surface-solid)',
                  borderColor: 'var(--bc-accent)',
                  color: 'var(--bc-accent)'
                }
              : { borderColor: 'var(--bc-hairline)', color: 'var(--bc-muted)' }
          "
          @click="store.selectProfile(profile.id)"
        >
          <span
            class="w-7 h-7 rounded-full grid place-items-center text-xs shrink-0"
            :style="{ backgroundColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
            aria-hidden="true"
            >{{ initial(profile) }}</span
          >
          {{ label(profile) }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
/* A row of children scrolls sideways; the bar itself would only add noise. */
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
