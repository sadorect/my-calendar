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
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useEventStore } from '@/stores/events'
import { format } from 'date-fns'

const props = defineProps({
  show: Boolean,
  template: Object
})

const emit = defineEmits(['close'])

const eventStore = useEventStore()

const eventData = ref({
  title: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00',
  duration: 60,
  isAllDay: false,
  location: '',
  notes: ''
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

  await eventStore.addEvent(event)
  close()
}

function close() {
  emit('close')
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
