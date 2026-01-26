<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-30"
    @click="close"
  >
    <div class="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-auto" @click.stop>
      <div class="p-6">
        <h2 class="text-xl font-semibold mb-4">Add New Event</h2>
        <form @submit.prevent="saveEvent" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              v-model="eventData.title"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              v-model="eventData.date"
              type="date"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div v-if="!eventData.isAllDay">
            <label class="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              v-model="eventData.startTime"
              type="time"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div v-if="!eventData.isAllDay">
            <label class="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              v-model.number="eventData.duration"
              type="number"
              min="1"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="flex items-center">
            <input
              v-model="eventData.isAllDay"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label class="ml-2 block text-sm text-gray-900">All Day</label>
          </div>
          <div v-if="template.requiresLocation">
            <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              v-model="eventData.location"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              v-model="eventData.notes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Conflict Warning -->
          <div
            v-if="conflicts.length > 0"
            class="bg-yellow-50 border border-yellow-200 rounded-md p-3"
          >
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3 flex-1">
                <h3 class="text-sm font-medium text-yellow-800">Time Conflict Detected</h3>
                <div class="mt-2 text-sm text-yellow-700">
                  <p>This event conflicts with:</p>
                  <ul class="mt-1 list-disc list-inside">
                    <li v-for="conflict in conflicts" :key="conflict.id">
                      {{ conflict.title }} ({{ formatTime(conflict.startDateTime) }} -
                      {{ formatTime(conflict.endDateTime) }})
                    </li>
                  </ul>
                </div>
                <div v-if="availableSlots.length > 0" class="mt-3">
                  <p class="text-sm font-medium text-yellow-800">Available time slots:</p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button
                      v-for="slot in availableSlots.slice(0, 3)"
                      :key="slot.start"
                      type="button"
                      @click="selectTimeSlot(slot)"
                      class="px-3 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md transition-colors"
                    >
                      {{ slot.label }}
                    </button>
                  </div>
                </div>
                <div v-else class="mt-3">
                  <p class="text-sm text-yellow-700">
                    No available slots today. Consider choosing a different day.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="close"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useEventStore } from '@/stores/events'
import { format } from 'date-fns'

const props = defineProps({
  show: Boolean,
  template: Object
})

const emit = defineEmits(['close'])

const eventStore = useEventStore()
const saving = ref(false)

const eventData = ref({
  title: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00',
  duration: 60,
  isAllDay: false,
  location: '',
  notes: ''
})

// Computed property to check for conflicts
const conflicts = computed(() => {
  if (!eventData.value.date || !eventData.value.startTime || !eventData.value.duration) {
    return []
  }

  const startDateTime = eventData.value.isAllDay
    ? `${eventData.value.date}T00:00:00`
    : `${eventData.value.date}T${eventData.value.startTime}:00`

  const endDateTime = eventData.value.isAllDay
    ? `${eventData.value.date}T23:59:59`
    : new Date(
        new Date(startDateTime).getTime() + eventData.value.duration * 60 * 1000
      ).toISOString()

  const proposedEvent = {
    id: null, // New event, no ID yet
    startDateTime,
    endDateTime
  }

  return eventStore.checkConflicts(proposedEvent)
})

// Function to select a specific time slot
function selectTimeSlot(slot) {
  const startTime = new Date(slot.start)
  eventData.value.startTime = format(startTime, 'HH:mm')
}

// Computed property to get available time slots
const availableSlots = computed(() => {
  if (!eventData.value.date || !eventData.value.duration) {
    return []
  }

  return eventStore.suggestTimeSlots(
    eventData.value.date,
    eventData.value.duration,
    props.template?.category
  )
})

watch(
  () => props.template,
  (newTemplate) => {
    if (newTemplate) {
      eventData.value = {
        title: newTemplate.name,
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        duration: newTemplate.defaultDuration || 60,
        isAllDay: newTemplate.allDay || false,
        location: '',
        notes: ''
      }
    }
  }
)

async function saveEvent() {
  saving.value = true

  const startDateTime = eventData.value.isAllDay
    ? `${eventData.value.date}T00:00:00`
    : `${eventData.value.date}T${eventData.value.startTime}:00`

  const endDateTime = eventData.value.isAllDay
    ? `${eventData.value.date}T23:59:59`
    : new Date(
        new Date(startDateTime).getTime() + eventData.value.duration * 60 * 1000
      ).toISOString()

  const event = {
    title: eventData.value.title,
    category: props.template.category,
    startDateTime,
    endDateTime,
    isAllDay: eventData.value.isAllDay,
    location: eventData.value.location,
    notes: eventData.value.notes,
    color: props.template.color,
    isCompleted: false
  }

  try {
    await eventStore.addEvent(event)
    close()
  } catch (error) {
    console.error('Error saving event:', error)
  } finally {
    saving.value = false
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
