import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as db from '@/services/database'

export const useEventStore = defineStore('events', () => {
  const events = ref([])
  const loading = ref(false)

  const eventsByDate = computed(() => {
    // Group events by date
    const grouped = {}
    events.value.forEach((event) => {
      const date = event.startDateTime.split('T')[0]
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(event)
    })
    return grouped
  })

  const upcomingEvents = computed(() => {
    // Get next 7 days of events
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return events.value
      .filter((event) => {
        const eventDate = new Date(event.startDateTime)
        return eventDate >= now && eventDate <= nextWeek
      })
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))
  })

  async function fetchEvents() {
    loading.value = true
    events.value = await db.getAllEvents()
    loading.value = false
  }

  async function addEvent(event) {
    const newEvent = await db.addEvent(event)
    events.value.push(newEvent)
    return newEvent
  }

  async function updateEvent(id, updates) {
    await db.updateEvent(id, updates)
    const index = events.value.findIndex((e) => e.id === id)
    if (index !== -1) {
      events.value[index] = { ...events.value[index], ...updates }
    }
  }

  async function deleteEvent(id) {
    await db.deleteEvent(id)
    events.value = events.value.filter((e) => e.id !== id)
  }

  function checkConflicts(newEvent) {
    // Return conflicting events
    const start = new Date(newEvent.startDateTime)
    const end = new Date(newEvent.endDateTime)
    return events.value.filter((event) => {
      if (event.id === newEvent.id) return false
      const eStart = new Date(event.startDateTime)
      const eEnd = new Date(event.endDateTime)
      return start < eEnd && end > eStart
    })
  }

  function suggestTimeSlots(date, duration) {
    // Return available slots
    // Simple implementation: find gaps in the day
    const dayEvents = events.value.filter((event) => event.startDateTime.startsWith(date))
    // Assume 9am to 5pm working hours
    const startHour = 9
    const endHour = 17
    const slots = []
    for (let hour = startHour; hour < endHour; hour++) {
      const slotStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00`)
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000)
      const conflict = dayEvents.some((event) => {
        const eStart = new Date(event.startDateTime)
        const eEnd = new Date(event.endDateTime)
        return slotStart < eEnd && slotEnd > eStart
      })
      if (!conflict) {
        slots.push(slotStart.toISOString())
      }
    }
    return slots
  }

  async function addSampleEvents() {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const sampleEvents = [
      {
        title: 'Team Meeting',
        category: 'Work Meeting',
        startDateTime: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          10,
          0
        ).toISOString(),
        endDateTime: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          11,
          0
        ).toISOString(),
        isAllDay: false,
        location: 'Conference Room A',
        notes: 'Weekly team sync',
        color: '#2196F3'
      },
      {
        title: 'Gym Session',
        category: 'Gym/Workout',
        startDateTime: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          18,
          0
        ).toISOString(),
        endDateTime: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          19,
          15
        ).toISOString(),
        isAllDay: false,
        location: 'Fitness Center',
        notes: 'Cardio and weights',
        color: '#F44336'
      },
      {
        title: 'Lunch with Sarah',
        category: 'Meal/Lunch',
        startDateTime: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          12,
          30
        ).toISOString(),
        endDateTime: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          14,
          0
        ).toISOString(),
        isAllDay: false,
        location: 'Downtown Cafe',
        notes: 'Catch up over lunch',
        color: '#FF9800'
      }
    ]

    for (const event of sampleEvents) {
      await addEvent(event)
    }
  }

  return {
    events,
    loading,
    eventsByDate,
    upcomingEvents,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    checkConflicts,
    suggestTimeSlots,
    addSampleEvents
  }
})
