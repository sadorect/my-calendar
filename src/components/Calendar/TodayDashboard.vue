<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800">
        Today - {{ formatDate(new Date()) }}
      </h1>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="bg-blue-50 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold text-blue-600">{{ todaysEvents.length }}</div>
        <div class="text-sm text-gray-600">Events Today</div>
      </div>
      <div class="bg-green-50 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold text-green-600">{{ completedEventsCount }}</div>
        <div class="text-sm text-gray-600">Completed</div>
      </div>
    </div>

    <!-- Notification Settings -->
    <NotificationSettings />

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
          :class="{ 'opacity-60': event.isCompleted }"
        >
          <div class="flex justify-between items-start">
            <div class="flex items-start space-x-3 flex-1">
              <input
                type="checkbox"
                :checked="event.isCompleted"
                @change="toggleCompletion(event.id)"
                class="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <div class="flex-1">
                <div
                  class="font-medium text-gray-900"
                  :class="{ 'line-through text-gray-500': event.isCompleted }"
                >
                  {{ event.title }}
                </div>
                <div class="text-sm text-gray-600 mt-1">{{ formatTime(event.startDateTime) }}</div>
                <div v-if="event.location" class="text-sm text-gray-500 mt-1">
                  📍 {{ event.location }}
                </div>
                <div v-if="event.isRecurring" class="text-xs text-blue-600 mt-1">🔄 Recurring</div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="editEvent(event)"
                class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Edit event"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                @click="duplicateEvent(event.id)"
                class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Duplicate event"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                @click="confirmDelete(event)"
                class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete event"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
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
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="font-medium text-gray-900">{{ event.title }}</div>
              <div class="text-sm text-gray-600">
                {{ formatDate(new Date(event.startDateTime)) }}
              </div>
              <div v-if="event.location" class="text-sm text-gray-500 mt-1">
                📍 {{ event.location }}
              </div>
              <div v-if="event.isRecurring" class="text-xs text-blue-600 mt-1">🔄 Recurring</div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="editEvent(event)"
                class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Edit event"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                @click="duplicateEvent(event.id)"
                class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Duplicate event"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                @click="confirmDelete(event)"
                class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete event"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
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
  </div>

  <!-- Edit Event Modal -->
  <QuickAddModal
    v-if="showEditModal"
    :show="showEditModal"
    :template="
      editingEvent
        ? { category: editingEvent.category, color: editingEvent.color, name: editingEvent.title }
        : null
    "
    :initial-event="editingEvent"
    @close="closeEditModal"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { useEventStore } from '@/stores/events'
import { format, isToday } from 'date-fns'
import NotificationSettings from '@/components/NotificationSettings.vue'
import QuickAddModal from '@/components/Events/QuickAddModal.vue'

const eventStore = useEventStore()

// Edit modal state
const showEditModal = ref(false)
const editingEvent = ref(null)

const todaysEvents = computed(() => {
  return eventStore.events.filter((event) => isToday(new Date(event.startDateTime)))
})

const completedEventsCount = computed(() => {
  return todaysEvents.value.filter((event) => event.isCompleted).length
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

async function toggleCompletion(eventId) {
  await eventStore.toggleEventCompletion(eventId)
}

async function duplicateEvent(eventId) {
  await eventStore.duplicateEvent(eventId)
}

function editEvent(event) {
  editingEvent.value = event
  showEditModal.value = true
}

function confirmDelete(event) {
  if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
    deleteEvent(event.id)
  }
}

async function deleteEvent(eventId) {
  await eventStore.deleteEvent(eventId)
}

function closeEditModal() {
  showEditModal.value = false
  editingEvent.value = null
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
