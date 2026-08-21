import { describe, it, expect } from 'vitest'
import {
  buildKeepsake,
  estimatePages,
  KEEPSAKE_SECTIONS,
  DEFAULT_SECTIONS
} from '../../src/services/keepsake.js'
import { TOTAL_DAYS } from '../../src/services/pregnancyTimeline.js'

const dueDate = new Date(2026, 11, 1).toISOString()

function state(overrides = {}) {
  return {
    babyName: '',
    dueDate,
    favourites: {},
    journal: {},
    spoken: {},
    settings: { voice: 'parents' },
    ...overrides
  }
}

describe('buildKeepsake', () => {
  it('includes only the sections asked for, in a stable order', () => {
    const all = buildKeepsake(state(), ['journal', 'favourites', 'weeks', 'declarations'])
    expect(all.sections.map((s) => s.id)).toEqual(KEEPSAKE_SECTIONS.map((s) => s.id))

    const some = buildKeepsake(state(), ['journal'])
    expect(some.sections.map((s) => s.id)).toEqual(['journal'])
  })

  it('defaults to the personal sections, not the whole book', () => {
    const built = buildKeepsake(state())
    expect(built.sections.map((s) => s.id)).not.toContain('declarations')
    expect(built.sections.map((s) => s.id).sort()).toEqual(['favourites', 'journal', 'weeks'])
  })

  it('carries every written day when the full book is asked for', () => {
    const built = buildKeepsake(state(), ['declarations'])
    const section = built.sections[0]
    expect(section.months).toHaveLength(9)
    const days = section.months.reduce((n, m) => n + m.days.length, 0)
    expect(days).toBe(TOTAL_DAYS)
  })

  it('substitutes the chosen name into the declarations', () => {
    const built = buildKeepsake(state({ babyName: 'Ada' }), ['declarations'])
    const first = built.sections[0].months[0].days[0]
    expect(first.text).toContain('Ada')
    expect(first.text).not.toContain('Little one')
  })

  it('uses the partner voice where the content provides one', () => {
    const parents = buildKeepsake(state(), ['declarations']).sections[0].months[0].days
    const partner = buildKeepsake(state({ settings: { voice: 'partner' } }), ['declarations'])
      .sections[0].months[0].days
    // Day 2 has a partner rephrase; day 1 does not, and must fall back.
    expect(partner[1].text).not.toBe(parents[1].text)
    expect(partner[0].text).toBe(parents[0].text)
  })

  it('orders favourites by when they were saved and resolves their content', () => {
    const built = buildKeepsake(
      state({
        favourites: {
          'day:5': '2026-03-02T10:00:00.000Z',
          'day:2': '2026-03-01T10:00:00.000Z',
          'week:3': '2026-03-03T10:00:00.000Z'
        }
      }),
      ['favourites']
    )
    const items = built.sections[0].items
    expect(items.map((i) => i.label)).toEqual(['Day 2', 'Day 5', 'Week 3'])
    expect(items[0].title).toBeTruthy()
    expect(items[0].date).toBeTruthy()
  })

  it('drops a favourite whose content no longer exists rather than printing a blank', () => {
    const built = buildKeepsake(state({ favourites: { 'day:999': '2026-03-01T10:00:00.000Z' } }), [
      'favourites'
    ])
    expect(built.sections[0].items).toEqual([])
  })

  it('prints journal entries oldest first and skips empty ones', () => {
    const built = buildKeepsake(
      state({
        journal: {
          40: { text: 'Felt you move.', updatedAt: '2026-04-01T00:00:00.000Z' },
          12: { text: 'Told my mother today.', updatedAt: '2026-02-01T00:00:00.000Z' },
          20: { text: '   ', updatedAt: '2026-03-01T00:00:00.000Z' }
        }
      }),
      ['journal']
    )
    const entries = built.sections[0].entries
    expect(entries.map((e) => e.day)).toEqual([12, 40])
    expect(entries[0].declarationTitle).toBeTruthy()
    expect(entries[0].age).toMatch(/week/)
  })

  it('summarises the cover from what the user actually has', () => {
    const built = buildKeepsake(
      state({
        babyName: 'Ada',
        spoken: { 1: 'x', 2: 'x' },
        journal: { 3: { text: 'Something' } },
        favourites: { 'day:1': 'x' }
      })
    )
    expect(built.cover.babyName).toBe('Ada')
    expect(built.cover.spokenCount).toBe(2)
    expect(built.cover.journalCount).toBe(1)
    expect(built.cover.favouriteCount).toBe(1)
    expect(built.cover.dueDate).toBeTruthy()
  })

  it('works before a due date is set', () => {
    const built = buildKeepsake(state({ dueDate: null }), DEFAULT_SECTIONS)
    expect(built.cover.dueDate).toBe('')
    expect(() => estimatePages(built)).not.toThrow()
  })
})

describe('estimatePages', () => {
  it('grows with the amount included', () => {
    const small = estimatePages(buildKeepsake(state(), ['journal']))
    const whole = estimatePages(buildKeepsake(state(), ['declarations', 'weeks']))
    expect(whole).toBeGreaterThan(small)
    expect(whole).toBeGreaterThan(60)
  })
})
