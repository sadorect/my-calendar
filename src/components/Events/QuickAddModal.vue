<template>
  <div
    v-if="show && (isEditing || (template && template.name && template.category))"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-30"
    @click="close"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
  >
    <div class="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-auto" @click.stop>
      <div class="p-6">
        <h2 id="modal-title" class="text-xl font-semibold mb-4">
          {{ isEditing ? 'Edit Event' : 'Add New Event' }}
        </h2>
        <p id="modal-description" class="text-sm text-gray-600 mb-4">
          {{
            isEditing
              ? 'Update the event details below.'
              : 'Fill in the details to create a new event.'
          }}
        </p>
        <form @submit.prevent="saveEvent" class="space-y-4">
          <div>
            <label for="event-title" class="block text-sm font-medium text-gray-700 mb-1"
              >Title</label
            >
            <input
              id="event-title"
              v-model="eventData.title"
              required
              aria-required="true"
              aria-describedby="title-error"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div
              v-if="errors.title"
              id="title-error"
              class="text-red-600 text-sm mt-1"
              role="alert"
            >
              {{ errors.title }}
            </div>
          </div>
          <div>
            <label for="event-date" class="block text-sm font-medium text-gray-700 mb-1"
              >Start Date</label
            >
            <input
              id="event-date"
              v-model="eventData.date"
              type="date"
              required
              aria-required="true"
              aria-describedby="date-error"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div v-if="errors.date" id="date-error" class="text-red-600 text-sm mt-1" role="alert">
              {{ errors.date }}
            </div>
          </div>
          <div v-if="!eventData.isAllDay && eventData.isMultiDay">
            <label for="event-end-date" class="block text-sm font-medium text-gray-700 mb-1"
              >End Date</label
            >
            <input
              id="event-end-date"
              v-model="eventData.endDate"
              type="date"
              :min="eventData.date"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div
              v-if="errors.endDate"
              id="end-date-error"
              class="text-red-600 text-sm mt-1"
              role="alert"
            >
              {{ errors.endDate }}
            </div>
          </div>
          <div v-if="!eventData.isAllDay && !eventData.isMultiDay">
            <label class="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              v-model="eventData.startTime"
              type="time"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div v-if="errors.startTime" class="text-red-600 text-sm mt-1" role="alert">
              {{ errors.startTime }}
            </div>
          </div>
          <div v-if="!eventData.isAllDay && !eventData.isMultiDay">
            <label class="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <div class="flex gap-2">
              <input
                v-model.number="durationValue"
                type="number"
                min="1"
                required
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                v-model="durationUnit"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
              </select>
            </div>
            <div v-if="errors.duration" class="text-red-600 text-sm mt-1" role="alert">
              {{ errors.duration }}
            </div>
          </div>
          <div class="flex items-center">
            <input
              id="all-day-checkbox"
              v-model="eventData.isAllDay"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label for="all-day-checkbox" class="ml-2 block text-sm text-gray-900 cursor-pointer">
              All Day Event
            </label>
          </div>
          <div v-if="!eventData.isAllDay" class="flex items-center">
            <input
              id="multi-day-checkbox"
              v-model="eventData.isMultiDay"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label for="multi-day-checkbox" class="ml-2 block text-sm text-gray-900 cursor-pointer">
              Multi-Day Event
            </label>
          </div>
          <div v-if="template && template.requiresLocation">
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

          <!-- Reminders -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Reminders</label>
            <div class="space-y-2">
              <label
                v-for="reminder in availableReminders"
                :key="reminder.value"
                class="flex items-center"
              >
                <input
                  v-model="selectedReminders"
                  :value="reminder.value"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span class="ml-2 text-sm text-gray-700">{{ reminder.label }}</span>
              </label>
            </div>
          </div>

          <!-- Recurring Event -->
          <div>
            <div class="flex items-center mb-2">
              <input
                v-model="eventData.isRecurring"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label class="ml-2 block text-sm font-medium text-gray-700">Recurring Event</label>
            </div>
            <div v-if="eventData.isRecurring" class="ml-6 space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
                <select
                  v-model="eventData.recurrence.frequency"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Every</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="eventData.recurrence.interval"
                    type="number"
                    min="1"
                    max="99"
                    class="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-600">{{
                    eventData.recurrence.frequency.replace('ly', '') +
                    (eventData.recurrence.interval > 1 ? 's' : '')
                  }}</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  v-model="eventData.recurrence.endDate"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
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
                      {{ conflict.title || 'Untitled Event' }} ({{
                        formatTime(conflict.startDateTime)
                      }}
                      - {{ formatTime(conflict.endDateTime) }})
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
              {{ saving ? 'Saving...' : isEditing ? 'Update' : 'Save' }}
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
  template: Object,
  initialEvent: Object
})

const emit = defineEmits(['close'])

const eventStore = useEventStore()
const saving = ref(false)
const errors = ref({})

const isEditing = computed(() => !!props.initialEvent)

const eventData = ref({
  title: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  endDate: '',
  startTime: '09:00',
  duration: 60,
  isAllDay: false,
  isMultiDay: false,
  location: '',
  notes: '',
  reminders: [], // Start with empty array, will be populated by checkboxes
  isRecurring: false,
  recurrence: {
    frequency: 'weekly',
    interval: 1,
    endDate: ''
  }
})

// Duration input handling
const durationUnit = ref('minutes')
const durationValue = ref(60)

// Computed property to get the internal duration in minutes
const internalDuration = computed(() => {
  if (durationUnit.value === 'hours') {
    return durationValue.value * 60
  }
  return durationValue.value
})

// Sync eventData.duration with internalDuration
watch(internalDuration, (newVal) => {
  eventData.value.duration = newVal
})

// Watch for unit changes to convert the displayed value
watch(durationUnit, (newUnit, oldUnit) => {
  if (newUnit === 'hours' && oldUnit === 'minutes') {
    // Converting from minutes to hours
    durationValue.value = durationValue.value / 60
  } else if (newUnit === 'minutes' && oldUnit === 'hours') {
    // Converting from hours to minutes
    durationValue.value = durationValue.value * 60
  }
})

const availableReminders = [
  { value: 1440, label: '1 day before' },
  { value: 60, label: '1 hour before' },
  { value: 30, label: '30 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 5, label: '5 minutes before' }
]

// Computed property to handle reminders as numbers
const selectedReminders = computed({
  get: () => eventData.value.reminders.map((r) => parseInt(r, 10)),
  set: (value) => {
    eventData.value.reminders = value.map((r) => parseInt(r, 10))
  }
})

// Computed property to check for conflicts
const conflicts = computed(() => {
  // Don't compute conflicts if template is not properly set for new events
  if (!props.show || (!props.initialEvent && (!props.template || !props.template.category))) {
    return []
  }

  if (!eventData.value.date) {
    return []
  }

  // For multi-day events, we need endDate
  if (eventData.value.isMultiDay && !eventData.value.endDate) {
    return []
  }

  // For same-day timed events, we need startTime and duration
  if (
    !eventData.value.isAllDay &&
    !eventData.value.isMultiDay &&
    (!eventData.value.startTime || !eventData.value.duration)
  ) {
    return []
  }

  let startDateTime, endDateTime

  if (eventData.value.isAllDay) {
    startDateTime = `${eventData.value.date}T00:00:00`
    endDateTime = `${eventData.value.date}T23:59:59`
  } else if (eventData.value.isMultiDay && eventData.value.endDate) {
    startDateTime = `${eventData.value.date}T00:00:00`
    endDateTime = `${eventData.value.endDate}T23:59:59`
  } else {
    startDateTime = `${eventData.value.date}T${eventData.value.startTime}:00`
    endDateTime = new Date(
      new Date(startDateTime).getTime() + eventData.value.duration * 60 * 1000
    ).toISOString()
  }

  const proposedEvent = {
    id: null, // New event, no ID yet
    startDateTime,
    endDateTime
  }

  const conflictingEvents = eventStore.checkConflicts(proposedEvent)

  // Filter out any malformed events that don't have required properties
  const validConflicts = conflictingEvents.filter(
    (event) =>
      event && typeof event === 'object' && event.title && event.startDateTime && event.endDateTime
  )

  return validConflicts
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
    if (newTemplate && !props.initialEvent) {
      eventData.value = {
        title: newTemplate.name,
        date: format(new Date(), 'yyyy-MM-dd'),
        endDate: '',
        startTime: '09:00',
        duration: newTemplate.defaultDuration || 60,
        isAllDay: newTemplate.allDay || false,
        isMultiDay: false,
        location: '',
        notes: '',
        reminders: [15],
        isRecurring: false,
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          endDate: ''
        }
      }
      // Set duration UI values
      const templateDuration = newTemplate.defaultDuration || 60
      if (templateDuration >= 60 && templateDuration % 60 === 0) {
        durationUnit.value = 'hours'
        durationValue.value = templateDuration / 60
      } else {
        durationUnit.value = 'minutes'
        durationValue.value = templateDuration
      }
    }
  }
)

watch(
  () => props.initialEvent,
  (newEvent) => {
    if (newEvent) {
      const startDate = new Date(newEvent.startDateTime)
      const endDate = new Date(newEvent.endDateTime)
      const duration = (endDate - startDate) / (1000 * 60) // duration in minutes

      // Check if this is a multi-day event
      const startDateStr = format(startDate, 'yyyy-MM-dd')
      const endDateStr = format(endDate, 'yyyy-MM-dd')
      const isMultiDay = startDateStr !== endDateStr

      eventData.value = {
        title: newEvent.title,
        date: startDateStr,
        endDate: isMultiDay ? endDateStr : '',
        startTime: format(startDate, 'HH:mm'),
        duration: duration,
        isAllDay: newEvent.isAllDay,
        isMultiDay: isMultiDay,
        location: newEvent.location || '',
        notes: newEvent.notes || '',
        reminders: newEvent.reminders || [],
        isRecurring: newEvent.isRecurring || false,
        recurrence: newEvent.recurrence || {
          frequency: 'weekly',
          interval: 1,
          endDate: ''
        }
      }

      // Set duration UI values - prefer hours if duration is divisible by 60 and >= 60
      if (duration >= 60 && duration % 60 === 0) {
        durationUnit.value = 'hours'
        durationValue.value = duration / 60
      } else {
        durationUnit.value = 'minutes'
        durationValue.value = duration
      }
    }
  }
)

async function saveEvent() {
  // Reset errors
  errors.value = {}

  // Basic validation
  if (!eventData.value.title.trim()) {
    errors.value.title = 'Title is required'
  }
  if (!eventData.value.date) {
    errors.value.date = 'Start date is required'
  }
  if (eventData.value.isMultiDay && !eventData.value.endDate) {
    errors.value.endDate = 'End date is required for multi-day events'
  }
  if (eventData.value.endDate && eventData.value.endDate < eventData.value.date) {
    errors.value.endDate = 'End date must be after start date'
  }
  if (!eventData.value.isAllDay && !eventData.value.isMultiDay && !eventData.value.startTime) {
    errors.value.startTime = 'Start time is required'
  }
  if (!eventData.value.isAllDay && !eventData.value.isMultiDay && !durationValue.value) {
    errors.value.duration = 'Duration is required'
  }

  // If there are errors, don't save
  if (Object.keys(errors.value).length > 0) {
    return
  }

  saving.value = true

  const startDateTime = eventData.value.isAllDay
    ? `${eventData.value.date}T00:00:00`
    : `${eventData.value.date}T${eventData.value.startTime}:00`

  let endDateTime
  if (eventData.value.isAllDay) {
    endDateTime = `${eventData.value.date}T23:59:59`
  } else if (eventData.value.isMultiDay && eventData.value.endDate) {
    // Multi-day event: end at the end of the end date
    endDateTime = `${eventData.value.endDate}T23:59:59`
  } else {
    // Same-day event: calculate based on duration
    endDateTime = new Date(
      new Date(startDateTime).getTime() + eventData.value.duration * 60 * 1000
    ).toISOString()
  }

  const event = {
    title: String(eventData.value.title || '').trim(),
    category: String(
      isEditing.value ? props.initialEvent.category : props.template ? props.template.category : ''
    ),
    startDateTime: String(startDateTime),
    endDateTime: String(endDateTime),
    isAllDay: Boolean(eventData.value.isAllDay),
    location: String(eventData.value.location || ''),
    notes: String(eventData.value.notes || ''),
    color: String(
      isEditing.value ? props.initialEvent.color : props.template ? props.template.color : '#2196F3'
    ),
    isCompleted: Boolean(isEditing.value ? props.initialEvent.isCompleted : false),
    reminders: Array.isArray(eventData.value.reminders)
      ? eventData.value.reminders
          .map((r) => {
            const num = parseInt(r, 10)
            return isNaN(num) ? null : num
          })
          .filter((r) => r !== null && r > 0)
      : [],
    isRecurring: Boolean(eventData.value.isRecurring),
    recurrence: eventData.value.isRecurring
      ? {
          frequency: String(eventData.value.recurrence.frequency || 'weekly'),
          interval: Math.max(1, parseInt(eventData.value.recurrence.interval, 10) || 1),
          endDate: eventData.value.recurrence.endDate
            ? String(eventData.value.recurrence.endDate)
            : null
        }
      : null
  }

  // Ensure all values are serializable
  try {
    JSON.stringify(event)
  } catch (error) {
    console.error('Event data is not serializable:', error, event)
    throw new Error('Event data contains non-serializable values')
  }

  console.log('Saving event:', event)

  try {
    if (isEditing.value) {
      await eventStore.updateEvent(props.initialEvent.id, event)
    } else {
      await eventStore.addEvent(event)
    }
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
