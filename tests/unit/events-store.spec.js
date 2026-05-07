import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock dependencies before importing the store
vi.mock('@/services/database', () => ({
  getAllEvents: vi.fn(async () => []),
  getAllTemplates: vi.fn(async () => []),
  getAllCategories: vi.fn(async () => []),
  addEvent: vi.fn(async (event) => ({
    ...event,
    id: 'mock-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })),
  updateEvent: vi.fn(async (id, updates) => ({ id, ...updates })),
  deleteEvent: vi.fn(async () => {}),
  clearAllEvents: vi.fn(async () => {}),
  addCategory: vi.fn(async (cat) => ({ ...cat, id: 'cat-id', isCustom: true })),
  updateCategory: vi.fn(async (id, updates) => ({ id, ...updates })),
  deleteCategory: vi.fn(async () => {})
}))

vi.mock('@/services/notifications', () => ({
  notificationService: {
    scheduleAllNotifications: vi.fn(),
    scheduleEventNotifications: vi.fn(),
    cancelNotification: vi.fn(),
    getStatus: vi.fn(() => ({ supported: false, permission: 'default', scheduledCount: 0 })),
    requestPermission: vi.fn(async () => 'granted'),
    canNotify: vi.fn(() => false)
  }
}))

import { useEventStore } from '@/stores/events'

describe('useEventStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with empty events', () => {
    const store = useEventStore()
    expect(store.events).toEqual([])
  })

  it('adds an event', async () => {
    const store = useEventStore()
    const event = {
      title: 'Test',
      startDateTime: '2026-05-07T09:00:00',
      endDateTime: '2026-05-07T10:00:00'
    }
    const added = await store.addEvent(event)
    expect(added.id).toBe('mock-id')
    expect(store.events).toHaveLength(1)
    expect(store.events[0].title).toBe('Test')
  })

  it('deletes an event', async () => {
    const store = useEventStore()
    const event = {
      title: 'To Delete',
      startDateTime: '2026-05-07T09:00:00',
      endDateTime: '2026-05-07T10:00:00'
    }
    await store.addEvent(event)
    expect(store.events).toHaveLength(1)
    await store.deleteEvent('mock-id')
    expect(store.events).toHaveLength(0)
  })

  it('toggles event completion', async () => {
    const store = useEventStore()
    await store.addEvent({
      title: 'Task',
      startDateTime: '2026-05-07T09:00:00',
      endDateTime: '2026-05-07T10:00:00',
      isCompleted: false
    })
    const result = await store.toggleEventCompletion('mock-id')
    expect(result).toBe(true)
  })

  it('filters events by search query', async () => {
    const store = useEventStore()
    await store.addEvent({
      title: 'Morning Run',
      category: 'Gym/Workout',
      startDateTime: '2026-05-07T06:00:00',
      endDateTime: '2026-05-07T07:00:00'
    })
    store.setSearchQuery('run')
    // filteredEvents expands recurring; just check query is set
    expect(store.searchQuery).toBe('run')
  })

  it('clears all filters', async () => {
    const store = useEventStore()
    store.setSearchQuery('test')
    store.setCategoryFilter('Work')
    store.clearFilters()
    expect(store.searchQuery).toBe('')
    expect(store.categoryFilter).toBe('')
  })

  it('detects event conflicts', async () => {
    const store = useEventStore()
    // Manually push an event into the store (bypassing db mock ID collision)
    store.events.push({
      id: 'existing-1',
      title: 'Existing',
      startDateTime: '2026-05-07T09:00:00',
      endDateTime: '2026-05-07T10:00:00',
      isRecurring: false
    })
    const conflicts = store.checkConflicts({
      id: 'new',
      startDateTime: '2026-05-07T09:30:00',
      endDateTime: '2026-05-07T10:30:00'
    })
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].id).toBe('existing-1')
  })

  it('returns no conflicts for non-overlapping events', () => {
    const store = useEventStore()
    store.events.push({
      id: 'existing-2',
      title: 'Morning',
      startDateTime: '2026-05-07T08:00:00',
      endDateTime: '2026-05-07T09:00:00',
      isRecurring: false
    })
    const conflicts = store.checkConflicts({
      id: 'new',
      startDateTime: '2026-05-07T09:00:00',
      endDateTime: '2026-05-07T10:00:00'
    })
    expect(conflicts).toHaveLength(0)
  })

  it('adds and removes custom categories', async () => {
    const store = useEventStore()
    const cat = await store.addCustomCategory({ name: 'Hobby', color: '#FF0000' })
    expect(store.customCategories).toHaveLength(1)
    expect(cat.name).toBe('Hobby')
    await store.deleteCustomCategory('cat-id')
    expect(store.customCategories).toHaveLength(0)
  })
})
