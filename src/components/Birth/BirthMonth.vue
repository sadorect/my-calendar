<script setup>
import { computed } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import { dayNumbersInMonth, dayContent } from '../../data/pregnancy/index.js'
import { weekOfPregnancy } from '../../services/pregnancyTimeline.js'

const store = usePregnancyStore()
const emit = defineEmits(['open-day'])

/** Month being browsed — follows the active day, navigable with the arrows. */
const month = computed(() => store.activeMonth)

const days = computed(() => {
  if (!month.value) return []
  return dayNumbersInMonth(month.value).map((day) => ({
    day,
    week: weekOfPregnancy(day),
    content: dayContent(day),
    isToday: day === store.todayDay,
    isActive: day === store.activeDay,
    isPast: store.todayDay != null && day < store.todayDay,
    spoken: store.isSpoken(day),
    favourite: store.isFavourite('day', day),
    hasJournal: Boolean(store.journalFor(day)),
  }))
})

/** Grouped into rows of gestational weeks, which is how people think about it. */
const weekGroups = computed(() => {
  const groups = new Map()
  for (const d of days.value) {
    if (!groups.has(d.week)) groups.set(d.week, [])
    groups.get(d.week).push(d)
  }
  return [...groups.entries()].map(([week, entries]) => ({ week, entries }))
})

function step(delta) {
  const target = store.monthNumber((month.value?.month || 1) + delta)
  if (target) store.selectDay(target.startDay)
}

const canPrev = computed(() => (month.value?.month || 1) > 1)
const canNext = computed(() => (month.value?.month || 9) < 9)
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto">
    <header class="flex items-center justify-between gap-3 mb-6">
      <button
        class="bc-tap rounded-full flex items-center justify-center border transition disabled:opacity-30 hover:opacity-70"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        :disabled="!canPrev" aria-label="Previous month" @click="step(-1)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div class="text-center">
        <p class="text-xs uppercase tracking-[0.2em] bc-muted">Month {{ month?.month }}</p>
        <h1 class="font-serif text-2xl">{{ month?.title }}</h1>
      </div>

      <button
        class="bc-tap rounded-full flex items-center justify-center border transition disabled:opacity-30 hover:opacity-70"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        :disabled="!canNext" aria-label="Next month" @click="step(1)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </header>

    <section v-if="month?.keyScripture" class="bc-card p-5 mb-6 animate-soft-fade">
      <p class="bc-scripture text-base mb-2">“{{ month.keyScripture.text }}”</p>
      <p class="text-sm bc-accent">{{ month.keyScripture.ref }}</p>
    </section>

    <div v-for="group in weekGroups" :key="group.week" class="mb-6">
      <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-2 px-1">Week {{ group.week }}</p>
      <ul class="space-y-2">
        <li v-for="d in group.entries" :key="d.day">
          <button
            class="bc-card w-full text-left px-4 py-3 flex items-center gap-3 transition hover:opacity-90"
            :style="d.isActive ? { borderColor: 'var(--bc-accent)', borderWidth: '2px' } : {}"
            :aria-current="d.isToday ? 'date' : undefined"
            @click="emit('open-day', d.day)"
          >
            <span
              class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
              :style="
                d.isToday
                  ? { backgroundColor: 'var(--bc-accent)', color: '#fff' }
                  : { backgroundColor: 'var(--bc-hairline)' }
              "
            >{{ d.day }}</span>

            <span class="min-w-0 flex-1">
              <span class="block font-serif truncate" :class="d.content ? '' : 'bc-muted italic'">
                {{ d.content ? d.content.title : 'Coming soon' }}
              </span>
              <span v-if="d.isToday" class="text-xs bc-accent">Today</span>
            </span>

            <span class="shrink-0 flex items-center gap-1.5" aria-hidden="true">
              <svg v-if="d.hasJournal" class="w-4 h-4 bc-muted" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
              </svg>
              <svg v-if="d.favourite" class="w-4 h-4" viewBox="0 0 24 24" :fill="'var(--bc-accent)'">
                <path d="M12 21s-6.5-4.35-8.5-8A4.5 4.5 0 0112 7.5 4.5 4.5 0 0120.5 13c-2 3.65-8.5 8-8.5 8z" />
              </svg>
              <svg v-if="d.spoken" class="w-4 h-4" fill="none" :stroke="'var(--bc-accent)'" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
