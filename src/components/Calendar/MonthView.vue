<template>
  <div class="calendar-container">
    <FullCalendar ref="calendarRef" :options="calendarOptions" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useEventStore } from '@/stores/events'

const eventStore = useEventStore()
const calendarRef = ref(null)

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  editable: true,
  events: eventStore.events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startDateTime,
    end: event.endDateTime,
    backgroundColor: event.color,
    allDay: event.isAllDay
  })),
  dateClick: handleDateClick,
  eventClick: handleEventClick,
  eventDrop: handleEventDrop
}))

function handleDateClick(info) {
  console.log('Date clicked:', info.dateStr)
  // TODO: Open quick add modal
}

function handleEventClick(info) {
  console.log('Event clicked:', info.event.id)
  // TODO: Open event details
}

function handleEventDrop(info) {
  const eventId = info.event.id
  const newStart = info.event.start
  const newEnd = info.event.end

  // Calculate duration in minutes
  const duration = newEnd ? (newEnd - newStart) / (1000 * 60) : 60

  // Update the event in the store
  eventStore.updateEvent(eventId, {
    startDateTime: newStart.toISOString(),
    endDateTime: newEnd
      ? newEnd.toISOString()
      : new Date(newStart.getTime() + duration * 60 * 1000).toISOString()
  })
}
</script>

<style scoped>
.calendar-container {
  height: 70vh;
  min-height: 400px;
}
</style>
