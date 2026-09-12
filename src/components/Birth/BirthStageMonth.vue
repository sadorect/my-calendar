<script setup>
import { computed } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'

const store = usePregnancyStore()
const emit = defineEmits(['open-day'])

const position = computed(() => store.activeStagePosition)

const monthLabel = computed(() =>
  store.activeStageDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
)

/** Blank cells before the 1st, so the grid lines up with the weekday columns. */
const leadingBlanks = computed(() => {
  const first = new Date(position.value.year, position.value.month - 1, 1)
  // Monday-first, which is what the rest of the app uses.
  return (first.getDay() + 6) % 7
})

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function open(day) {
  store.selectStageDate(new Date(position.value.year, position.value.month - 1, day.day))
  emit('open-day', day.key)
}
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto">
    <header class="flex items-center gap-3 mb-6">
      <button
        class="bc-tap shrink-0 w-11 h-11 rounded-full grid place-items-center border transition hover:opacity-70"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        aria-label="Previous month"
        @click="store.stepStageMonth(-1)"
      >
        ←
      </button>
      <div class="flex-1 min-w-0 text-center">
        <p class="text-xs uppercase tracking-[0.2em] bc-muted mb-1">{{ monthLabel }}</p>
        <h1 class="text-2xl font-serif truncate">{{ store.activeTheme?.title }}</h1>
      </div>
      <button
        class="bc-tap shrink-0 w-11 h-11 rounded-full grid place-items-center border transition hover:opacity-70"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        aria-label="Next month"
        @click="store.stepStageMonth(1)"
      >
        →
      </button>
    </header>

    <button
      v-if="!store.isViewingStageToday"
      class="bc-tap block mx-auto mb-6 px-4 py-2 rounded-xl text-sm border transition hover:opacity-70"
      :style="{ borderColor: 'var(--bc-hairline)' }"
      @click="store.goToStageToday()"
    >
      Back to today
    </button>

    <div class="bc-card p-4 mb-8">
      <div class="grid grid-cols-7 gap-1 mb-2" aria-hidden="true">
        <span
          v-for="(d, i) in WEEKDAYS"
          :key="i"
          class="text-center text-[0.65rem] uppercase tracking-widest bc-muted"
          >{{ d }}</span
        >
      </div>
      <div class="grid grid-cols-7 gap-1">
        <span v-for="n in leadingBlanks" :key="`blank-${n}`" aria-hidden="true" />
        <button
          v-for="day in store.stageMonthDays"
          :key="day.key"
          class="bc-tap aspect-square rounded-xl text-sm flex flex-col items-center justify-center transition"
          :class="day.entry ? '' : 'opacity-40'"
          :aria-current="day.isToday ? 'date' : undefined"
          :aria-label="`Day ${day.day}${day.entry ? ': ' + day.entry.title : ', not written yet'}`"
          :style="
            day.isToday
              ? { backgroundColor: 'var(--bc-accent)', color: '#fff' }
              : { backgroundColor: 'var(--bc-hairline)' }
          "
          @click="open(day)"
        >
          {{ day.day }}
          <span
            v-if="day.spoken"
            class="w-1.5 h-1.5 rounded-full mt-0.5"
            :style="{ backgroundColor: day.isToday ? '#fff' : 'var(--bc-accent)' }"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>

    <section>
      <h2 class="text-xs uppercase tracking-[0.16em] bc-muted mb-3">The year’s themes</h2>
      <ul class="space-y-2">
        <li
          v-for="theme in store.stageThemes"
          :key="theme.month"
          class="bc-card px-4 py-3 flex items-center gap-3"
          :class="theme.month === position.month ? '' : 'opacity-80'"
        >
          <span class="text-xs bc-muted w-6 shrink-0">{{ theme.month }}</span>
          <span class="flex-1 min-w-0 truncate text-sm">{{ theme.title }}</span>
          <span v-if="theme.month === position.month" class="text-xs bc-accent shrink-0">
            This month
          </span>
          <span v-else-if="!theme.written" class="text-xs bc-muted shrink-0">Coming</span>
        </li>
      </ul>
    </section>
  </div>
</template>
