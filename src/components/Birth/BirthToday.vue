<script setup>
import { computed } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import { TOTAL_DAYS } from '../../services/pregnancyTimeline.js'
import DeclarationCard from './DeclarationCard.vue'

const store = usePregnancyStore()
const emit = defineEmits(['open-day', 'open-weeks'])

const baby = computed(() => store.state.babyName || 'your little one')

const progressLabel = computed(() => {
  const age = store.activeAge
  if (!age) return ''
  return `${age.weeks}w ${age.days}d`
})

const countdown = computed(() => {
  const r = store.remaining
  if (r === null) return ''
  if (r > 1) return `${r} days to go`
  if (r === 1) return 'One day to go'
  if (r === 0) return 'Due today'
  return `${Math.abs(r)} ${Math.abs(r) === 1 ? 'day' : 'days'} past your due date`
})

// Circumference of the r=54 progress ring, precomputed so the template stays
// readable rather than doing arithmetic inline.
const RING = 2 * Math.PI * 54
const ringOffset = computed(() => RING * (1 - store.progress))
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto">
    <!-- Month theme -->
    <section class="text-center mb-8 animate-gentle-rise">
      <p class="text-xs uppercase tracking-[0.2em] bc-muted mb-2">
        Month {{ store.activeMonth?.month }} · Week {{ store.activeWeek }}
      </p>
      <h1 class="font-serif text-3xl sm:text-4xl leading-tight mb-3">
        {{ store.activeMonth?.title }}
      </h1>
      <p class="bc-muted text-sm leading-relaxed max-w-md mx-auto">
        {{ store.activeMonth?.intro }}
      </p>
    </section>

    <!-- Progress ring -->
    <section class="flex flex-col items-center mb-8" aria-label="Pregnancy progress">
      <div class="relative w-40 h-40">
        <svg class="w-full h-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bc-hairline)" stroke-width="6" />
          <circle
            cx="60" cy="60" r="54" fill="none" stroke="var(--bc-accent)" stroke-width="6"
            stroke-linecap="round" :stroke-dasharray="RING" :stroke-dashoffset="ringOffset"
            style="transition: stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="font-serif text-3xl leading-none">{{ progressLabel }}</span>
          <span class="text-xs bc-muted mt-1">Day {{ store.todayDay }} of {{ TOTAL_DAYS }}</span>
        </div>
      </div>
      <p class="text-sm bc-muted mt-3">{{ countdown }}</p>
      <p v-if="store.spokenStreak > 1" class="text-xs bc-accent mt-1">
        {{ store.spokenStreak }} days spoken in a row
      </p>
    </section>

    <!-- Not on today: offer a way back -->
    <div v-if="!store.isViewingToday" class="mb-4 flex justify-center">
      <button
        class="bc-tap px-4 py-2 rounded-full text-sm border transition hover:opacity-70"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        @click="store.goToToday()"
      >
        ← Back to today
      </button>
    </div>

    <!-- Today's declaration -->
    <DeclarationCard
      v-if="store.activeDayContent"
      :day="store.activeDay"
      :content="store.activeDayContent"
      :baby-name="baby"
      prominent
      @open="emit('open-day', store.activeDay)"
    />

    <!-- Day exists on the timeline but has not been written yet -->
    <div v-else class="bc-card p-8 text-center animate-gentle-rise">
      <p class="font-serif text-xl mb-2">Still being written</p>
      <p class="bc-muted text-sm leading-relaxed">
        The declarations for Month {{ store.activeMonth?.month }} are not ready yet.
        Until then, rest in this month's promise.
      </p>
      <blockquote
        v-if="store.activeMonth?.keyScripture"
        class="bc-scripture mt-5 text-base"
      >
        “{{ store.activeMonth.keyScripture.text }}”
        <footer class="text-sm bc-accent mt-2 not-italic">
          {{ store.activeMonth.keyScripture.ref }}
        </footer>
      </blockquote>
    </div>

    <!-- This week -->
    <section v-if="store.activeWeekContent" class="mt-6">
      <button
        class="bc-card w-full p-5 text-left transition hover:opacity-90"
        @click="emit('open-weeks')"
      >
        <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-2">
          This week · Week {{ store.activeWeekContent.week }}
        </p>
        <p class="font-serif text-lg mb-2">{{ store.activeWeekContent.title }}</p>
        <p class="text-sm bc-muted leading-relaxed line-clamp-3">
          {{ store.activeWeekContent.declaration }}
        </p>
        <span class="inline-block mt-3 text-sm bc-accent">Read the week →</span>
      </button>
    </section>
  </div>
</template>
