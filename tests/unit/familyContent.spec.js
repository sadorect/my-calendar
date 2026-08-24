import { describe, it, expect } from 'vitest'
import {
  THEMES,
  themeForMonth,
  stageMonthContent,
  stageDayContent,
  stageWeekContent,
  themesForStage,
  stageCoverage
} from '../../src/data/family/index.js'
import { weekOfMonth, dayFavouriteKey, weekFavouriteKey } from '../../src/services/stageTimeline.js'

const WRITTEN = ['school', 'teen']

describe('the twelve themes', () => {
  it('covers every calendar month exactly once', () => {
    expect(THEMES).toHaveLength(12)
    expect(THEMES.map((t) => t.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('has a distinct slug and title per theme', () => {
    expect(new Set(THEMES.map((t) => t.slug)).size).toBe(12)
    expect(new Set(THEMES.map((t) => t.title)).size).toBe(12)
  })

  it('answers for a real month and not for a fake one', () => {
    expect(themeForMonth(1).title).toBe('Identity & Belonging')
    expect(themeForMonth(13)).toBeNull()
  })
})

describe.each(WRITTEN)('%s — Identity & Belonging', (stage) => {
  const file = stageMonthContent(stage, 1)

  it('is written', () => {
    expect(file).toBeTruthy()
    expect(file.stage).toBe(stage)
    expect(file.title).toBe('Identity & Belonging')
  })

  it('has an intro and one or two key Scriptures', () => {
    expect(file.intro.length).toBeGreaterThan(80)
    expect(file.keyScriptures.length).toBeGreaterThanOrEqual(1)
    expect(file.keyScriptures.length).toBeLessThanOrEqual(2)
    for (const s of file.keyScriptures) {
      expect(s.ref).toBeTruthy()
      expect(s.text).toBeTruthy()
    }
  })

  it('covers every day a month can have', () => {
    expect(file.days).toHaveLength(31)
    expect(file.days.map((d) => d.day)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1))
  })

  it('gives every day a title, a declaration and a Scripture', () => {
    for (const day of file.days) {
      expect(day.title, `day ${day.day}`).toBeTruthy()
      expect(day.declaration.length, `day ${day.day}`).toBeGreaterThan(40)
      expect(day.scripture.ref, `day ${day.day}`).toBeTruthy()
      expect(day.scripture.text, `day ${day.day}`).toBeTruthy()
    }
  })

  it('never repeats a day title', () => {
    const titles = file.days.map((d) => d.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('has four weekly declarations, each with a prayer for the parents', () => {
    expect(file.weeks.map((w) => w.week)).toEqual([1, 2, 3, 4])
    for (const week of file.weeks) {
      expect(week.title).toBeTruthy()
      expect(week.declaration.length).toBeGreaterThan(80)
      expect(week.parentsPrayer.length).toBeGreaterThan(40)
    }
  })

  it('speaks in the second person, without a vocative the app has to patch', () => {
    // Born-stage content addresses the child directly rather than opening with
    // a name placeholder, so it reads correctly whether or not a name is set —
    // "Little one" would be wrong over a fifteen-year-old.
    for (const day of file.days) {
      expect(day.declaration, `day ${day.day}`).not.toMatch(/Little one/i)
    }
  })
})

describe('looking content up', () => {
  it('finds a day and the month it belongs to', () => {
    const entry = stageDayContent('school', 1, 3)
    expect(entry.title).toBe('Wonderfully Made')
    expect(entry.month.title).toBe('Identity & Belonging')
  })

  it('finds the weekly card for a week', () => {
    expect(stageWeekContent('teen', 1, 2).title).toBe('Belonging Is Not Fitting In')
  })

  it('returns null for content nobody has written yet', () => {
    expect(stageMonthContent('school', 2)).toBeNull()
    expect(stageDayContent('school', 2, 1)).toBeNull()
    expect(stageWeekContent('infant', 1, 1)).toBeNull()
    expect(stageDayContent('nonsense', 1, 1)).toBeNull()
  })

  it('reports honestly how much of a stage exists', () => {
    expect(stageCoverage('school')).toEqual({ monthsWritten: 1, monthsTotal: 12, daysWritten: 31 })
    expect(stageCoverage('toddler').monthsWritten).toBe(0)
  })

  it('marks which themes a stage has', () => {
    const themes = themesForStage('teen')
    expect(themes[0].written).toBe(true)
    expect(themes.filter((t) => t.written)).toHaveLength(1)
  })
})

describe('the week a day falls in', () => {
  it('puts the first four sevenths in weeks one to four', () => {
    expect([1, 7].map(weekOfMonth)).toEqual([1, 1])
    expect([8, 14].map(weekOfMonth)).toEqual([2, 2])
    expect([15, 21].map(weekOfMonth)).toEqual([3, 3])
    expect([22, 28].map(weekOfMonth)).toEqual([4, 4])
  })

  it('keeps the tail of a long month in week four rather than inventing a fifth', () => {
    expect([29, 30, 31].map(weekOfMonth)).toEqual([4, 4, 4])
  })
})

describe('favourite keys', () => {
  it('are padded so they sort and never collide', () => {
    expect(dayFavouriteKey('school', 1, 3)).toBe('school:m01:d03')
    expect(dayFavouriteKey('school', 12, 31)).toBe('school:m12:d31')
    expect(weekFavouriteKey('teen', 9, 2)).toBe('teen:m09:w2')
  })

  it('cannot be confused with a womb favourite', () => {
    expect(dayFavouriteKey('school', 1, 3)).not.toBe('day:3')
  })
})
