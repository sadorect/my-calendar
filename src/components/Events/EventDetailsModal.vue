<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-30"
    @click="close"
  >
    <div class="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-auto" @click.stop>
      <div class="p-6">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-xl font-semibold text-gray-800">{{ event.title }}</h2>
          <button @click="close" class="text-gray-400 hover:text-gray-600">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="space-y-3 mb-6">
          <div class="flex items-center text-gray-600">
            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{{ formatDateTime(event.startDateTime) }}</span>
            <span v-if="!event.isAllDay"> - {{ formatTime(event.endDateTime) }}</span>
          </div>

          <div v-if="event.location" class="flex items-center text-gray-600">
            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{{ event.location }}</span>
          </div>

          <div v-if="event.notes" class="text-gray-600">
            <div class="font-medium mb-1">Notes:</div>
            <div class="text-sm">{{ event.notes }}</div>
          </div>

          <div v-if="event.isRecurring" class="flex items-center text-blue-600">
            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span class="text-sm">Recurring event</span>
          </div>

          <div class="flex items-center">
            <div
              class="px-3 py-1 rounded-full text-sm font-medium text-white"
              :style="{ backgroundColor: event.color }"
            >
              {{ event.category }}
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="editEvent"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit Event
          </button>
          <button
            @click="duplicateEvent"
            class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Duplicate
          </button>
          <button
            @click="confirmDelete"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { format } from 'date-fns'

const props = defineProps({
  show: Boolean,
  event: Object
})

const emit = defineEmits(['close', 'edit', 'duplicate', 'delete'])

function formatDateTime(dateTime) {
  const date = new Date(dateTime)
  return format(date, 'PPP p')
}

function formatTime(dateTime) {
  return format(new Date(dateTime), 'p')
}

function editEvent() {
  emit('edit', props.event)
  close()
}

function duplicateEvent() {
  emit('duplicate', props.event.id)
  close()
}

function confirmDelete() {
  if (confirm(`Are you sure you want to delete "${props.event.title}"?`)) {
    emit('delete', props.event.id)
    close()
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
