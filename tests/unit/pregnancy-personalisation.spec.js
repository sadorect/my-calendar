import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/database', () => ({
  getSetting: vi.fn(async () => null),
  setSetting: vi.fn(async () => {})
}))

import { usePregnancyStore } from '@/stores/pregnancy'

/** A due date that puts "today" in the middle of the timeline. */
function dueDateForDay(day) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + (280 - day))
  return d
}

describe('name personalisation across every surface', () => {
  let store

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = usePregnancyStore()
    await store.setDueDate(dueDateForDay(100))
    await store.setBabyName('Zoe')
  })

  it('names the baby in the week cards, not just today', () => {
    const cards = store.monthWeekCards.filter((c) => !c.placeholder)
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.declaration).not.toMatch(/Little one/)
    }
    expect(cards.some((c) => c.declaration.includes('Zoe'))).toBe(true)
  })

  it('names the baby in the this-week card on Today', () => {
    expect(store.activeWeekContent.declaration).not.toMatch(/Little one/)
  })

  it('names the baby in the declaration for today', () => {
    expect(store.activeDayContent.body).not.toMatch(/Little one/)
  })

  it('names the baby in saved favourites', async () => {
    await store.toggleFavourite('week', store.activeWeek)
    await store.toggleFavourite('day', store.activeDay)
    for (const fav of store.favourites) {
      expect(fav.entry.declaration).not.toMatch(/Little one/)
    }
  })

  it('leaves the default address alone when no name is set', async () => {
    await store.setBabyName('')
    const card = store.monthWeekCards.find((c) => !c.placeholder)
    expect(card.declaration).toMatch(/Little one/)
  })
})
