import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as db from '@/services/database'
import { notificationService } from '@/services/notifications'
import { useHistory } from '@/composables/useHistory'
import { addDays, addWeeks, addMonths, addYears, isBefore, format, parseISO } from 'date-fns'

// Function to expand recurring events into individual instances
function expandRecurringEvents(events, startDate, endDate) {
  const expandedEvents = []

  events.forEach((event) => {
    if (!event.isRecurring) {
      expandedEvents.push(event)
      return
    }

    const { recurrence } = event
    const startDateTime = parseISO(event.startDateTime)
    const endDateTime = parseISO(event.endDateTime)
    const recurrenceEndDate = recurrence.endDate
      ? parseISO(recurrence.endDate)
      : addYears(startDateTime, 1)

    let currentDate = startDateTime
    let instanceCount = 0
    const maxInstances = 100 // Prevent infinite loops

    while (isBefore(currentDate, recurrenceEndDate) && instanceCount < maxInstances) {
      // Check if this instance falls within the requested date range
      if (currentDate >= startDate && currentDate <= endDate) {
        const duration = endDateTime.getTime() - startDateTime.getTime()
        const instanceEndDateTime = new Date(currentDate.getTime() + duration)

        expandedEvents.push({
          ...event,
          id: `${event.id}_${format(currentDate, 'yyyy-MM-dd')}`,
          startDateTime: currentDate.toISOString(),
          endDateTime: instanceEndDateTime.toISOString(),
          originalEventId: event.id,
          isRecurringInstance: true
        })
      }

      // Calculate next occurrence
      switch (recurrence.frequency) {
        case 'daily':
          currentDate = addDays(currentDate, recurrence.interval)
          break
        case 'weekly':
          currentDate = addWeeks(currentDate, recurrence.interval)
          break
        case 'monthly':
          currentDate = addMonths(currentDate, recurrence.interval)
          break
        case 'yearly':
          currentDate = addYears(currentDate, recurrence.interval)
          break
        default:
          currentDate = addDays(currentDate, 1) // Fallback
      }

      instanceCount++
    }
  })

  return expandedEvents
}

export const useEventStore = defineStore('events', () => {
  const events = ref([])
  const loading = ref(false)
  const templates = ref([])
  const customCategories = ref([])
  const { record } = useHistory()

  const eventsByDate = computed(() => {
    // Expand recurring events for the next 3 months
    const now = new Date()
    const endDate = addMonths(now, 3)
    const expandedEvents = expandRecurringEvents(events.value, now, endDate)

    // Group events by date
    const grouped = {}
    expandedEvents.forEach((event) => {
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
    const expandedEvents = expandRecurringEvents(events.value, now, nextWeek)

    return expandedEvents
      .filter((event) => {
        const eventDate = new Date(event.startDateTime)
        return eventDate >= now && eventDate <= nextWeek
      })
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))
  })

  /**
   * Compute streaks for recurring events.
   * Returns an array of { eventId, title, category, color, currentStreak, longestStreak }
   * A "streak" counts consecutive periods (based on recurrence frequency) where
   * the event was marked completed.
   */
  const habitStreaks = computed(() => {
    const recurringEvents = events.value.filter((e) => e.isRecurring)
    const now = new Date()

    return recurringEvents
      .map((event) => {
        const { recurrence, startDateTime, endDateTime } = event
        if (!recurrence) return null

        // Expand instances from event start up to today
        const eventStart = parseISO(startDateTime)
        const instances = expandRecurringEvents([event], eventStart, now)

        // Sort by date ascending
        instances.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))

        // We only have completion stored on the base event in this implementation;
        // use the base event.completedDates set if present, or treat all past
        // instances as completed if event.isCompleted is true (simple heuristic).
        // For a richer experience, per-instance completion would be tracked separately.
        const completedDates = new Set(event.completedDates || [])
        const isGloballyCompleted = event.isCompleted

        let currentStreak = 0
        let longestStreak = 0
        let streak = 0

        for (let i = instances.length - 1; i >= 0; i--) {
          const inst = instances[i]
          const dateKey = inst.startDateTime.split('T')[0]
          const instDate = new Date(inst.startDateTime)

          // Skip instances in the future relative to today
          if (instDate > now) continue

          const done =
            completedDates.has(dateKey) || (isGloballyCompleted && i === instances.length - 1)

          if (done) {
            streak++
            if (currentStreak === 0) currentStreak = streak
            longestStreak = Math.max(longestStreak, streak)
          } else {
            if (currentStreak === 0) currentStreak = 0
            streak = 0
          }
        }

        return {
          eventId: event.id,
          title: event.title,
          category: event.category,
          color: event.color || '#6366F1',
          frequency: recurrence.frequency,
          currentStreak,
          longestStreak,
          totalInstances: instances.filter((i) => new Date(i.startDateTime) <= now).length
        }
      })
      .filter(Boolean)
  })

  // Search and filter state
  const searchQuery = ref('')
  const categoryFilter = ref('')
  const dateRangeFilter = ref(null)

  const filteredEvents = computed(() => {
    // Expand recurring events for filtering
    const now = new Date()
    const endDate = addMonths(now, 3)
    let expandedEvents = expandRecurringEvents(events.value, now, endDate)

    // Apply search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      expandedEvents = expandedEvents.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.category.toLowerCase().includes(query) ||
          event.notes?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query)
      )
    }

    // Apply category filter
    if (categoryFilter.value) {
      expandedEvents = expandedEvents.filter((event) => event.category === categoryFilter.value)
    }

    // Apply date range filter
    if (dateRangeFilter.value) {
      const { start, end } = dateRangeFilter.value
      expandedEvents = expandedEvents.filter((event) => {
        const eventDate = new Date(event.startDateTime)
        return eventDate >= start && eventDate <= end
      })
    }

    return expandedEvents
  })

  async function fetchEvents() {
    loading.value = true
    events.value = await db.getAllEvents()
    templates.value = await db.getAllTemplates()
    customCategories.value = await db.getAllCategories()
    loading.value = false

    // Schedule notifications for all events
    notificationService.scheduleAllNotifications(events.value)
  }

  async function addEvent(event) {
    const newEvent = await db.addEvent(event)
    events.value.push(newEvent)
    notificationService.scheduleEventNotifications(newEvent)

    record({
      label: `Add "${newEvent.title}"`,
      undo: async () => {
        await db.deleteEvent(newEvent.id)
        events.value = events.value.filter((e) => e.id !== newEvent.id)
      },
      redo: async () => {
        const { id, createdAt, updatedAt, ...rest } = newEvent
        const reAdded = await db.addEvent(rest)
        events.value.push(reAdded)
        notificationService.scheduleEventNotifications(reAdded)
      }
    })

    return newEvent
  }

  async function updateEvent(id, updates) {
    const original = events.value.find((e) => e.id === id)
    const snapshot = original ? { ...original } : null

    await db.updateEvent(id, updates)
    const index = events.value.findIndex((e) => e.id === id)
    if (index !== -1) {
      events.value[index] = { ...events.value[index], ...updates }
      notificationService.scheduleEventNotifications(events.value[index])
    }

    if (snapshot) {
      record({
        label: `Edit "${snapshot.title}"`,
        undo: async () => {
          await db.updateEvent(id, snapshot)
          const idx = events.value.findIndex((e) => e.id === id)
          if (idx !== -1) events.value[idx] = { ...snapshot }
          notificationService.scheduleEventNotifications(snapshot)
        },
        redo: async () => {
          await db.updateEvent(id, updates)
          const idx = events.value.findIndex((e) => e.id === id)
          if (idx !== -1) events.value[idx] = { ...events.value[idx], ...updates }
        }
      })
    }
  }

  async function deleteEvent(id) {
    const event = events.value.find((e) => e.id === id)
    const snapshot = event ? { ...event } : null

    await db.deleteEvent(id)
    events.value = events.value.filter((e) => e.id !== id)

    if (event && event.reminders) {
      event.reminders.forEach((minutesBefore) => {
        notificationService.cancelNotification(`${id}_${minutesBefore}`)
      })
    }

    if (snapshot) {
      record({
        label: `Delete "${snapshot.title}"`,
        undo: async () => {
          const { id: _id, createdAt, updatedAt, ...rest } = snapshot
          const reAdded = await db.addEvent(rest)
          events.value.push(reAdded)
          notificationService.scheduleEventNotifications(reAdded)
        },
        redo: async () => {
          const reAddedEvent = events.value.find((e) => e.title === snapshot.title)
          if (reAddedEvent) {
            await db.deleteEvent(reAddedEvent.id)
            events.value = events.value.filter((e) => e.id !== reAddedEvent.id)
          }
        }
      })
    }
  }

  async function toggleEventCompletion(id) {
    const event = events.value.find((e) => e.id === id)
    if (!event) return

    const newCompletionStatus = !event.isCompleted
    await updateEvent(id, { isCompleted: newCompletionStatus })

    return newCompletionStatus
  }

  async function duplicateEvent(id) {
    const originalEvent = events.value.find((e) => e.id === id)
    if (!originalEvent) return

    // Create a copy of the event with a new ID, keeping the original title
    const duplicatedEvent = {
      ...originalEvent,
      isCompleted: false
    }
    delete duplicatedEvent.id
    delete duplicatedEvent.createdAt
    delete duplicatedEvent.updatedAt

    // If it's a recurring event instance, duplicate the original recurring event
    if (originalEvent.isRecurringInstance) {
      const originalRecurringEvent = events.value.find(
        (e) => e.id === originalEvent.originalEventId
      )
      if (originalRecurringEvent) {
        const duplicatedRecurringEvent = {
          ...originalRecurringEvent,
          isCompleted: false
        }
        delete duplicatedRecurringEvent.id
        delete duplicatedRecurringEvent.createdAt
        delete duplicatedRecurringEvent.updatedAt
        return await addEvent(duplicatedRecurringEvent)
      }
    }

    return await addEvent(duplicatedEvent)
  }

  function checkConflicts(newEvent) {
    // Return conflicting events
    const start = new Date(newEvent.startDateTime)
    const end = new Date(newEvent.endDateTime)

    // For multi-day events, we need to check conflicts across all days
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())

    // Expand recurring events for the date range
    const dayEvents = expandRecurringEvents(events.value, startDate, endDate)

    const conflicts = dayEvents.filter((event) => {
      if (event.id === newEvent.id || event.originalEventId === newEvent.id) return false
      const eStart = new Date(event.startDateTime)
      const eEnd = new Date(event.endDateTime)
      return start < eEnd && end > eStart
    })

    return conflicts
  }

  function suggestTimeSlots(date, duration, category = null) {
    // Return available slots with smart suggestions
    const dayStart = new Date(`${date}T00:00:00`)
    const dayEnd = new Date(`${date}T23:59:59`)
    const dayEvents = expandRecurringEvents(events.value, dayStart, dayEnd)
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

  async function addCustomCategory(category) {
    const newCat = await db.addCategory(category)
    customCategories.value.push(newCat)
    return newCat
  }

  async function updateCustomCategory(id, updates) {
    const updated = await db.updateCategory(id, updates)
    const idx = customCategories.value.findIndex((c) => c.id === id)
    if (idx !== -1) customCategories.value[idx] = updated
    return updated
  }

  async function deleteCustomCategory(id) {
    await db.deleteCategory(id)
    customCategories.value = customCategories.value.filter((c) => c.id !== id)
  }

  async function restoreEvents(restoredEvents = []) {
    await db.clearAllEvents()
    events.value = []
    for (const event of restoredEvents) {
      const { id, createdAt, updatedAt, ...rest } = event
      const newEvent = await db.addEvent(rest)
      events.value.push(newEvent)
    }
    notificationService.scheduleAllNotifications(events.value)
  }

  // Notification functions
  async function requestNotificationPermission() {
    return await notificationService.requestPermission()
  }

  function getNotificationStatus() {
    return notificationService.getStatus()
  }

  function canNotify() {
    return notificationService.canNotify()
  }

  return {
    events,
    loading,
    templates,
    customCategories,
    eventsByDate,
    upcomingEvents,
    habitStreaks,
    filteredEvents,
    searchQuery,
    categoryFilter,
    dateRangeFilter,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleEventCompletion,
    duplicateEvent,
    checkConflicts,
    suggestTimeSlots,
    addSampleEvents,
    setSearchQuery,
    setCategoryFilter,
    setDateRangeFilter,
    clearFilters,
    restoreEvents,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    requestNotificationPermission,
    getNotificationStatus,
    canNotify
  }
})
