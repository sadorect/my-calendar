<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800">
        Today - {{ formatDate(new Date()) }}
      </h1>
      <button
        @click="addSampleEvents"
        class="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
      >
        Add Sample Events
      </button>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="bg-blue-50 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold text-blue-600">{{ todaysEvents.length }}</div>
        <div class="text-sm text-gray-600">Events Today</div>
      </div>
      <div class="bg-green-50 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold text-green-600">{{ freeTime }}</div>
        <div class="text-sm text-gray-600">Free Hours</div>
      </div>
    </div>

    <div>
      <h2 class="text-xl font-semibold mb-3 text-gray-800">Today's Events</h2>
      <div v-if="todaysEvents.length === 0" class="text-center py-8 text-gray-500">
        No events scheduled for today
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="event in todaysEvents"
          :key="event.id"
          class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="font-medium text-gray-900">{{ event.title }}</div>
              <div class="text-sm text-gray-600 mt-1">{{ formatTime(event.startDateTime) }}</div>
              <div v-if="event.location" class="text-sm text-gray-500 mt-1">
                📍 {{ event.location }}
              </div>
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

    <div>
      <h2 class="text-xl font-semibold mb-3 text-gray-800">Upcoming (Next 7 days)</h2>
      <div v-if="upcomingEvents.length === 0" class="text-center py-8 text-gray-500">
        No upcoming events
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="event in upcomingEvents"
          :key="event.id"
          class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
        >
          <div class="flex justify-between items-center">
            <div>
              <div class="font-medium text-gray-900">{{ event.title }}</div>
              <div class="text-sm text-gray-600">
                {{ formatDate(new Date(event.startDateTime)) }}
              </div>
            </div>
            <div
              class="px-2 py-1 rounded-full text-xs font-medium text-white"
              :style="{ backgroundColor: event.color }"
            >
              {{ event.category }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEventStore } from '@/stores/events'
import { format, isToday } from 'date-fns'

const eventStore = useEventStore()

const todaysEvents = computed(() => {
  return eventStore.events.filter((event) => isToday(new Date(event.startDateTime)))
})

const freeTime = computed(() => {
  // Simple calculation: 16 hours - total event hours
  const totalHours = todaysEvents.value.reduce((sum, event) => {
    const start = new Date(event.startDateTime)
    const end = new Date(event.endDateTime)
    return sum + (end - start) / (1000 * 60 * 60)
  }, 0)
  return Math.max(0, 16 - totalHours).toFixed(1)
})

const upcomingEvents = computed(() => eventStore.upcomingEvents)

function formatDate(date) {
  return format(date, 'PPP')
}

function formatTime(dateTime) {
  return format(new Date(dateTime), 'p')
}

async function addSampleEvents() {
  await eventStore.addSampleEvents()
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
