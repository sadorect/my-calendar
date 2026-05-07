<template>
  <div v-if="streaks.length" class="bg-theme-card border border-theme rounded-xl p-4">
    <h3 class="text-base font-semibold text-theme-primary mb-3 flex items-center gap-2">
      <span>🔥</span> Habit Streaks
    </h3>
    <ul class="space-y-3">
      <li v-for="habit in streaks" :key="habit.eventId" class="flex items-center gap-3">
        <!-- Color dot -->
        <span
          class="w-3 h-3 rounded-full flex-shrink-0"
          :style="{ backgroundColor: habit.color }"
        ></span>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-theme-primary truncate">{{ habit.title }}</p>
          <p class="text-xs text-theme-muted capitalize">{{ habit.frequency }}</p>
        </div>

        <!-- Streak badges -->
        <div class="flex gap-2 text-right flex-shrink-0">
          <div class="text-center">
            <p class="text-lg font-bold leading-none" :class="streakColor(habit.currentStreak)">
              {{ habit.currentStreak }}
            </p>
            <p class="text-xs text-theme-muted">current</p>
          </div>
          <div class="text-center">
            <p class="text-lg font-bold leading-none text-theme-muted">
              {{ habit.longestStreak }}
            </p>
            <p class="text-xs text-theme-muted">best</p>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEventStore } from '@/stores/events'

const eventStore = useEventStore()

const streaks = computed(() =>
  eventStore.habitStreaks
    .filter((h) => h.totalInstances > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 8)
)

function streakColor(n) {
  if (n >= 7) return 'text-orange-500'
  if (n >= 3) return 'text-yellow-500'
  if (n >= 1) return 'text-green-500'
  return 'text-theme-muted'
}
</script>
