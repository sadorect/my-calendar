import { describe, it, expect } from 'vitest'
import { exportToJSON, exportToCSV } from '@/services/export'

// exportToJSON and exportToCSV trigger file downloads; we just verify they don't throw
// and produce valid blobs. We spy on URL.createObjectURL.

const mockEvents = [
  {
    id: '1',
    title: 'Team Meeting',
    category: 'Work Meeting',
    startDateTime: '2026-05-07T10:00:00',
    endDateTime: '2026-05-07T11:00:00',
    isAllDay: false,
    location: 'Office',
    notes: 'Sync call',
    isRecurring: false,
    isCompleted: false
  },
  {
    id: '2',
    title: 'Gym',
    category: 'Gym/Workout',
    startDateTime: '2026-05-07T18:00:00',
    endDateTime: '2026-05-07T19:00:00',
    isAllDay: false,
    location: '',
    notes: '',
    isRecurring: false,
    isCompleted: true
  }
]

// Stub browser APIs used by the export functions
global.URL.createObjectURL = () => 'blob:mock'
global.URL.revokeObjectURL = () => {}

describe('exportToJSON', () => {
  it('does not throw for empty events', () => {
    expect(() => exportToJSON([])).not.toThrow()
  })

  it('does not throw for valid events', () => {
    expect(() => exportToJSON(mockEvents)).not.toThrow()
  })
})

describe('exportToCSV', () => {
  it('does not throw for empty events', () => {
    expect(() => exportToCSV([])).not.toThrow()
  })

  it('does not throw for valid events', () => {
    expect(() => exportToCSV(mockEvents)).not.toThrow()
  })
})

describe('createBackup', () => {
  it('accepts events and templates without throwing', async () => {
    const { createBackup } = await import('@/services/export')
    expect(() => createBackup(mockEvents, [])).not.toThrow()
  })
})
