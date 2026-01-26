<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold text-gray-800">All Events</h2>
    <div v-if="eventStore.events.length === 0" class="text-center py-8 text-gray-500">
      No events found
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="event in eventsWithConflicts"
        :key="event.id"
        class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
        :class="{ 'border-red-300 bg-red-50': event.hasConflict }"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-medium text-gray-900 flex items-center gap-2">
              {{ event.title }}
              <span v-if="event.hasConflict" class="text-red-500 text-sm">⚠️ Conflict</span>
            </div>
            <div class="text-sm text-gray-600 mt-1">{{ formatDateTime(event.startDateTime) }}</div>
            <div v-if="event.location" class="text-sm text-gray-500 mt-1">
              📍 {{ event.location }}
            </div>
            <div v-if="event.notes" class="text-sm text-gray-500 mt-1">{{ event.notes }}</div>
          </div>
          <div
            class="ml-3 px-2 py-1 rounded-full text-xs font-medium text-white"
            :style="{ backgroundColor: event.color }"
          >
            {{ event.category }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEventStore } from '@/stores/events'
import { format } from 'date-fns'

const eventStore = useEventStore()

// Computed property to check for conflicts
const eventsWithConflicts = computed(() => {
  return eventStore.filteredEvents.map((event) => {
    const conflicts = eventStore.checkConflicts(event)
    return {
      ...event,
      hasConflict: conflicts.length > 0
    }
  })
})

function formatDateTime(dateTime) {
  return format(new Date(dateTime), 'PPP p')
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
