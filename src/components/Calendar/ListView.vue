<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold text-gray-800">All Events</h2>
    <div v-if="eventStore.events.length === 0" class="text-center py-8 text-gray-500">
      No events found
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="event in eventStore.events"
        :key="event.id"
        class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-medium text-gray-900">{{ event.title }}</div>
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
import { useEventStore } from '@/stores/events'
import { format } from 'date-fns'

const eventStore = useEventStore()

function formatDateTime(dateTime) {
  return format(new Date(dateTime), 'PPP p')
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
