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
import dayGridPlugin from '@fullcalendar/daygrid'
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
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    editable: true,
    events: eventsWithConflicts.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.startDateTime,
      end: event.endDateTime,
      backgroundColor: event.color,
      allDay: event.isAllDay,
      classNames: event.hasConflict ? ['event-conflict'] : []
    })),
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    eventDrop: handleEventDrop
  }
})

function handleDateClick(info) {
  console.log('Date clicked:', info.dateStr)
  // TODO: Open quick add modal
}

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

function handleEventDrop(info) {
  const eventId = info.event.id
  const newStart = info.event.start

  // Get the original event to preserve its duration
  const originalEvent = eventStore.events.find((e) => e.id === eventId)
  if (!originalEvent) return

  const originalStart = new Date(originalEvent.startDateTime)
  const originalEnd = new Date(originalEvent.endDateTime)
  const duration = originalEnd.getTime() - originalStart.getTime()

  // Update the event in the store with preserved duration
  eventStore.updateEvent(eventId, {
    startDateTime: newStart.toISOString(),
    endDateTime: new Date(newStart.getTime() + duration).toISOString()
  })
}
</script>

<style scoped>
.calendar-container {
  height: 70vh;
  min-height: 400px;
}

/* Conflict event styling */
:deep(.event-conflict) {
  border: 2px solid #ef4444 !important;
  box-shadow: 0 0 0 1px #ef4444 !important;
}

:deep(.event-conflict::before) {
  content: '⚠️';
  position: absolute;
  right: 2px;
  top: 2px;
  font-size: 12px;
  z-index: 10;
}
</style>
