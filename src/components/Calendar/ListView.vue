<template>
  <div class="calendar-container">
    <FullCalendar ref="calendarRef" :options="calendarOptions" />

    <!-- Event Details Modal -->
    <EventDetailsModal
      v-if="showEventDetails"
      :show="showEventDetails"
      :event="selectedEvent"
      @close="closeEventDetails"
      @edit="editEvent"
      @duplicate="duplicateEvent"
      @delete="deleteEvent"
    />

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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { useEventStore } from '@/stores/events'
import EventDetailsModal from '@/components/Events/EventDetailsModal.vue'
import QuickAddModal from '@/components/Events/QuickAddModal.vue'

const eventStore = useEventStore()
const calendarRef = ref(null)

// Event details modal state
const showEventDetails = ref(false)
const selectedEvent = ref(null)

// Edit modal state
const showEditModal = ref(false)
const editingEvent = ref(null)

const calendarOptions = computed(() => {
  // Check for conflicts and mark events
  const eventsWithConflicts = eventStore.filteredEvents.map((event) => {
    const conflicts = eventStore.checkConflicts(event)
    return {
      ...event,
      hasConflict: conflicts.length > 0
    }
  })

  return {
    plugins: [listPlugin, interactionPlugin],
    initialView: 'listMonth',
    editable: false, // List view doesn't support drag-drop well
    events: eventsWithConflicts.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.startDateTime,
      end: event.endDateTime,
      backgroundColor: event.color,
      allDay: event.isAllDay,
      extendedProps: {
        category: event.category,
        location: event.location,
        notes: event.notes,
        hasConflict: event.hasConflict
      }
    })),
    eventClick: handleEventClick,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'listMonth,listWeek,listDay'
    },
    listDayFormat: { weekday: 'long' },
    listDaySideFormat: false,
    eventContent: function (arg) {
      // Custom event content for list view
      const event = arg.event
      const extendedProps = event.extendedProps

      let html = `<div class="flex items-center justify-between w-full">`
      html += `<div class="flex-1">`
      html += `<div class="font-medium ${extendedProps.hasConflict ? 'text-red-600' : 'text-gray-900'}">`
      if (extendedProps.hasConflict) {
        html += '⚠️ '
      }
      html += event.title
      html += `</div>`

      if (extendedProps.location) {
        html += `<div class="text-sm text-gray-500">📍 ${extendedProps.location}</div>`
      }

      if (extendedProps.notes) {
        html += `<div class="text-sm text-gray-500">${extendedProps.notes}</div>`
      }

      html += `</div>`

      html += `<div class="ml-3 px-2 py-1 rounded-full text-xs font-medium text-white" style="background-color: ${event.backgroundColor}">`
      html += extendedProps.category
      html += `</div>`

      html += `</div>`

      return { html }
    }
  }
})

function handleEventClick(info) {
  // Find the full event data from the store
  const event =
    eventStore.events.find((e) => e.id === info.event.id) ||
    eventStore.filteredEvents.find((e) => e.id === info.event.id)
  if (event) {
    selectedEvent.value = event
    showEventDetails.value = true
  }
}

function closeEventDetails() {
  showEventDetails.value = false
  selectedEvent.value = null
}

function editEvent(event) {
  editingEvent.value = event
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingEvent.value = null
}

function duplicateEvent(eventId) {
  eventStore.duplicateEvent(eventId)
}

function deleteEvent(eventId) {
  eventStore.deleteEvent(eventId)
}
</script>

<style scoped>
.calendar-container {
  height: 70vh;
  min-height: 400px;
}

/* Custom list view styling */
:deep(.fc-list-event) {
  border-left: 4px solid;
  border-left-color: inherit;
}

:deep(.fc-list-event:hover) {
  background-color: #f9fafb;
}
</style>
