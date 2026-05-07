<template>
  <aside
    class="hidden lg:flex flex-col w-64 flex-shrink-0 bg-theme-card border-r border-theme p-4 gap-4"
  >
    <!-- Month + navigation -->
    <div class="flex items-center justify-between">
      <button
        @click="prevMonth"
        class="p-1 rounded hover:bg-theme-secondary transition-colors text-theme-muted hover:text-theme-primary"
        aria-label="Previous month"
      >
        ‹
      </button>
      <span class="text-sm font-semibold text-theme-primary">
        {{ monthLabel }}
      </span>
      <button
        @click="nextMonth"
        class="p-1 rounded hover:bg-theme-secondary transition-colors text-theme-muted hover:text-theme-primary"
        aria-label="Next month"
      >
        ›
      </button>
    </div>

    <!-- Day-of-week headers -->
    <div class="grid grid-cols-7 text-center">
      <span v-for="d in dayHeaders" :key="d" class="text-xs font-medium text-theme-muted py-1">{{
        d
      }}</span>
    </div>

    <!-- Date grid -->
    <div class="grid grid-cols-7 text-center gap-y-1">
      <!-- Empty cells for offset -->
      <span v-for="n in startOffset" :key="`offset-${n}`"></span>

      <button
        v-for="day in daysInMonth"
        :key="day"
        @click="selectDay(day)"
        :class="dayClasses(day)"
        class="text-xs rounded-full w-7 h-7 mx-auto flex items-center justify-center transition-colors"
      >
        {{ day }}
      </button>
    </div>

    <!-- "Today" shortcut -->
    <button
      @click="goToToday"
      class="mt-auto text-xs text-theme-accent hover:underline text-center"
    >
      Go to Today
    </button>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { format, getDaysInMonth, startOfMonth, getDay, isToday, parseISO } from 'date-fns'
import { useEventStore } from '@/stores/events'

const emit = defineEmits(['select-date'])

const eventStore = useEventStore()

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth()) // 0-indexed

const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const monthLabel = computed(() => format(new Date(viewYear.value, viewMonth.value, 1), 'MMMM yyyy'))

const daysInMonth = computed(() => getDaysInMonth(new Date(viewYear.value, viewMonth.value, 1)))

const startOffset = computed(() => {
  const firstDay = startOfMonth(new Date(viewYear.value, viewMonth.value, 1))
  return getDay(firstDay) // 0 = Sunday
})

// Dates that have at least one event (for the current view month)
const datesWithEvents = computed(() => {
  const set = new Set()
  eventStore.events.forEach((event) => {
    const d = parseISO(event.startDateTime)
    if (d.getFullYear() === viewYear.value && d.getMonth() === viewMonth.value) {
      set.add(d.getDate())
    }
  })
  return set
})

const selectedDay = ref(today.getDate())

function dayClasses(day) {
  const isCurrentDay =
    today.getFullYear() === viewYear.value &&
    today.getMonth() === viewMonth.value &&
    today.getDate() === day

  const isSelected = selectedDay.value === day

  const hasEvent = datesWithEvents.value.has(day)

  return {
    'bg-theme-accent text-white font-bold': isSelected,
    'ring-2 ring-theme-accent ring-offset-1': isCurrentDay && !isSelected,
    'text-theme-primary hover:bg-theme-secondary': !isSelected,
    'font-semibold': hasEvent && !isSelected,
    'underline decoration-theme-accent decoration-2': hasEvent && !isSelected
  }
}

function selectDay(day) {
  selectedDay.value = day
  const dateStr = format(new Date(viewYear.value, viewMonth.value, day), 'yyyy-MM-dd')
  emit('select-date', dateStr)
}

function goToToday() {
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
  selectDay(today.getDate())
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}
</script>
