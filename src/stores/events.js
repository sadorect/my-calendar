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

  function suggestTimeSlots(date, duration, category = null) {
    // Return available slots with smart suggestions
    const dayEvents = events.value.filter((event) => event.startDateTime.startsWith(date))
    const durationMs = duration * 60 * 1000 // Convert to milliseconds

    // Define working hours (9 AM to 5 PM)
    const workEnd = new Date(`${date}T17:00:00`)

    const suggestions = []

    // If category has preferred times, prioritize them
    let timeSlots = []
    if (category) {
      // Get preferred times for this category
      const template = getTemplateByCategory(category)
      if (template && template.preferredTimes && template.preferredTimes.length > 0) {
        // First, try preferred times
        timeSlots = template.preferredTimes.map((hour) => hour)
      }
    }

    // If no preferred times or no category, use all working hours
    if (timeSlots.length === 0) {
      timeSlots = [9, 10, 11, 12, 13, 14, 15, 16] // 9 AM to 4 PM
    }

    // Check each time slot
    for (const hour of timeSlots) {
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
          label: `${hour}:00 - ${slotEnd.getHours()}:${slotEnd.getMinutes().toString().padStart(2, '0')}`,
          preferred: category ? true : false
        })
      }
    }

    // If no preferred slots available, try non-preferred times
    if (suggestions.length === 0 && category) {
      const allHours = [9, 10, 11, 12, 13, 14, 15, 16]
      for (const hour of allHours) {
        if (category && getTemplateByCategory(category)?.preferredTimes?.includes(hour)) continue // Skip preferred times we already checked

        const slotStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00`)
        const slotEnd = new Date(slotStart.getTime() + durationMs)

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
            label: `${hour}:00 - ${slotEnd.getHours()}:${slotEnd.getMinutes().toString().padStart(2, '0')}`,
            preferred: false
          })
        }
      }
    }

    // If still no slots available today, suggest next available day
    if (suggestions.length === 0) {
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      const nextDayStr = nextDay.toISOString().split('T')[0]

      // Recursively find next available day
      return suggestTimeSlots(nextDayStr, duration, category)
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

  function getTemplateByCategory(category) {
    // Simple template lookup - in a real app, this might come from a separate store
    const templates = [
      { category: 'Work Meeting', preferredTimes: [9, 10, 11, 14, 15, 16] },
      { category: 'Gym/Workout', preferredTimes: [6, 7, 17, 18, 19, 20] },
      { category: 'Doctor Appointment', preferredTimes: [8, 9, 10, 11, 14, 15, 16, 17] },
      { category: 'Meal/Lunch', preferredTimes: [11, 12, 13, 18, 19, 20] },
      { category: 'Travel', preferredTimes: [] },
      { category: 'Social Event', preferredTimes: [18, 19, 20, 21] },
      { category: 'Study Session', preferredTimes: [8, 9, 10, 14, 15, 16, 19, 20, 21] },
      { category: 'School Submission', preferredTimes: [] },
      { category: 'Project Milestone', preferredTimes: [9, 10, 11, 14, 15, 16] },
      { category: 'Phone Call', preferredTimes: [8, 9, 10, 11, 14, 15, 16, 17] },
      { category: 'Class/Lecture', preferredTimes: [8, 9, 10, 11, 12, 13, 14, 15, 16] },
      { category: 'Shopping/Errands', preferredTimes: [10, 11, 12, 13, 14, 15, 16, 18, 19, 20] },
      { category: 'School Runs', preferredTimes: [7, 8, 15, 16] },
      { category: 'Other', preferredTimes: [9, 10, 11, 14, 15, 16] }
    ]
    return templates.find((t) => t.category === category)
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
