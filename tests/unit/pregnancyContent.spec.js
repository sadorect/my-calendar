import { describe, it, expect } from 'vitest'
import {
  MONTHS,
  monthForDay,
  dayContent,
  weekContent,
  dayNumbersInMonth,
  contentCoverage,
} from '../../src/data/pregnancy/index.js'
import { TOTAL_DAYS, weekOfPregnancy } from '../../src/services/pregnancyTimeline.js'

describe('pregnancy content', () => {
  it('covers exactly 280 days with no gaps or overlaps', () => {
    // index.js validates this at load, but assert it here too so the failure
    // names the problem instead of blowing up on import somewhere unrelated.
    let expected = 1
    for (const m of MONTHS) {
      expect(m.startDay).toBe(expected)
      expected = m.endDay + 1
    }
    expect(expected - 1).toBe(TOTAL_DAYS)
  })

  it('resolves every day of the pregnancy to exactly one month', () => {
    for (let day = 1; day <= TOTAL_DAYS; day++) {
      const matches = MONTHS.filter((m) => day >= m.startDay && day <= m.endDay)
      expect(matches).toHaveLength(1)
      expect(monthForDay(day)).toBe(matches[0])
    }
  })

  it('has complete written content for all nine months', () => {
    for (const month of MONTHS) {
      expect(month.days, `month ${month.month} days`).toHaveLength(
        month.endDay - month.startDay + 1,
      )
      expect(month.weeks, `month ${month.month} weeks`).toHaveLength(
        month.endWeek - month.startWeek + 1,
      )
    }
    const coverage = contentCoverage()
    expect(coverage.daysWritten).toBe(TOTAL_DAYS)
    expect(coverage.monthsWritten).toBe(9)
    expect(coverage.weeksWritten).toBe(coverage.weeksTotal)
  })

  it('writes every day exactly once across the whole pregnancy', () => {
    const seen = new Set()
    for (const month of MONTHS) {
      for (const day of month.days) {
        expect(seen.has(day.day), `day ${day.day} written twice`).toBe(false)
        seen.add(day.day)
      }
    }
    for (let day = 1; day <= TOTAL_DAYS; day++) {
      expect(dayContent(day), `day ${day}`).toBeTruthy()
    }
  })

  it('gives every written day a title, declaration and scripture', () => {
    for (const month of MONTHS) {
      for (const day of month.days) {
        expect(day.title, `day ${day.day}`).toBeTruthy()
        expect(day.declaration, `day ${day.day}`).toBeTruthy()
        expect(day.scripture?.ref, `day ${day.day}`).toBeTruthy()
        expect(day.scripture?.text, `day ${day.day}`).toBeTruthy()
      }
    }
  })

  it('gives every written week a declaration and a prayer for the parents', () => {
    for (const month of MONTHS) {
      for (const week of month.weeks) {
        expect(week.declaration, `week ${week.week}`).toBeTruthy()
        expect(week.parentsPrayer, `week ${week.week}`).toBeTruthy()
      }
    }
  })

  it('places each written day inside the week its month claims', () => {
    for (const month of MONTHS) {
      for (const day of month.days) {
        const week = weekOfPregnancy(day.day)
        expect(week).toBeGreaterThanOrEqual(month.startWeek)
        expect(week).toBeLessThanOrEqual(month.endWeek)
      }
    }
  })

  it('returns null rather than throwing outside the pregnancy range', () => {
    expect(dayContent(1)).toBeTruthy()
    expect(dayContent(TOTAL_DAYS)).toBeTruthy()
    expect(dayContent(0)).toBeNull()
    expect(dayContent(TOTAL_DAYS + 1)).toBeNull()
    expect(weekContent(0)).toBeNull()
    expect(weekContent(41)).toBeNull()
  })

  it('enumerates a full month of day numbers', () => {
    const month9 = MONTHS[8]
    expect(dayNumbersInMonth(month9)).toHaveLength(35)
    expect(month9.days).toHaveLength(35)
  })

  it('never repeats a day title within a month', () => {
    for (const month of MONTHS) {
      const titles = month.days.map((d) => d.title)
      expect(new Set(titles).size, `month ${month.month}`).toBe(titles.length)
    }
  })
})
