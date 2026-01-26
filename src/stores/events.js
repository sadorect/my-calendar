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

  // Search and filter state
  const searchQuery = ref('')
  const categoryFilter = ref('')
  const dateRangeFilter = ref(null)

  const filteredEvents = computed(() => {
    let filtered = events.value

    // Apply search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.category.toLowerCase().includes(query) ||
          event.notes?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query)
      )
    }

    // Apply category filter
    if (categoryFilter.value) {
      filtered = filtered.filter((event) => event.category === categoryFilter.value)
    }

    // Apply date range filter
    if (dateRangeFilter.value) {
      const { start, end } = dateRangeFilter.value
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.startDateTime)
        return eventDate >= start && eventDate <= end
      })
    }

    return filtered
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
    // Return available slots with smart suggestions
    const dayEvents = events.value.filter((event) => event.startDateTime.startsWith(date))
    const durationMs = duration * 60 * 1000 // Convert to milliseconds

    // Define working hours (9 AM to 5 PM)
    const workEnd = new Date(`${date}T17:00:00`)

    const suggestions = []

    // Check each hour slot
    for (let hour = 9; hour < 17; hour++) {
      const slotStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00`)
      const slotEnd = new Date(slotStart.getTime() + durationMs)

      // Skip if slot extends beyond working hours
      if (slotEnd > workEnd) continue

      const conflict = dayEvents.some((event) => {
        const eStart = new Date(event.startDateTime)
        const eEnd = new Date(event.endDateTime)
        return slotStart < eEnd && slotEnd > eStart
      })

      if (!conflict) {
        suggestions.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          label: `${hour}:00 - ${slotEnd.getHours()}:${slotEnd.getMinutes().toString().padStart(2, '0')}`
        })
      }
    }

    // If no slots available today, suggest next available day
    if (suggestions.length === 0) {
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      const nextDayStr = nextDay.toISOString().split('T')[0]

      // Recursively find next available day
      return suggestTimeSlots(nextDayStr, duration)
    }

    return suggestions
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

  function setSearchQuery(query) {
    searchQuery.value = query
  }

  function setCategoryFilter(category) {
    categoryFilter.value = category
  }

  function setDateRangeFilter(range) {
    dateRangeFilter.value = range
  }

  function clearFilters() {
    searchQuery.value = ''
    categoryFilter.value = ''
    dateRangeFilter.value = null
  }

  return {
    events,
    loading,
    eventsByDate,
    upcomingEvents,
    filteredEvents,
    searchQuery,
    categoryFilter,
    dateRangeFilter,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    checkConflicts,
    suggestTimeSlots,
    addSampleEvents,
    setSearchQuery,
    setCategoryFilter,
    setDateRangeFilter,
    clearFilters
  }
})
