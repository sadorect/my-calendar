import { describe, it, expect } from 'vitest'
import {
  TOTAL_DAYS,
  daysBetween,
  lmpFromDueDate,
  dueDateFromLmp,
  dueDateFromCurrentProgress,
  dayOfPregnancy,
  dateForDay,
  weekOfPregnancy,
  gestationalAge,
  trimesterForDay,
  daysRemaining,
  timelineStatus,
} from '../../src/services/pregnancyTimeline.js'

const DUE = new Date('2026-12-25T00:00:00')

describe('pregnancy timeline', () => {
  it('places the due date at exactly 40w0d, day 280', () => {
    const day = dayOfPregnancy(DUE, DUE)
    expect(day).toBe(TOTAL_DAYS)
    expect(gestationalAge(day)).toEqual({ weeks: 40, days: 0 })
    expect(weekOfPregnancy(day)).toBe(40)
  })

  it('round-trips due date and LMP', () => {
    expect(dueDateFromLmp(lmpFromDueDate(DUE)).getTime()).toBe(DUE.getTime())
  })

  it('round-trips a day number through its calendar date', () => {
    for (const day of [1, 7, 91, 171, 280]) {
      expect(dayOfPregnancy(DUE, dateForDay(DUE, day))).toBe(day)
    }
  })

  it('reports gestational age the way a midwife says it', () => {
    expect(gestationalAge(1)).toEqual({ weeks: 0, days: 1 })
    expect(gestationalAge(7)).toEqual({ weeks: 1, days: 0 })
    expect(gestationalAge(171)).toEqual({ weeks: 24, days: 3 })
  })

  it('derives a due date from "I am X weeks and Y days"', () => {
    const today = new Date('2026-08-21T00:00:00')
    const due = dueDateFromCurrentProgress(24, 3, today)
    expect(gestationalAge(dayOfPregnancy(due, today))).toEqual({ weeks: 24, days: 3 })
  })

  it('maps weeks to days without gaps or overlaps', () => {
    expect(weekOfPregnancy(1)).toBe(1)
    expect(weekOfPregnancy(7)).toBe(1)
    expect(weekOfPregnancy(8)).toBe(2)
    expect(weekOfPregnancy(280)).toBe(40)
  })

  it('splits trimesters at the conventional boundaries', () => {
    expect(trimesterForDay(91)).toBe(1) // week 13
    expect(trimesterForDay(92)).toBe(2) // week 14
    expect(trimesterForDay(189)).toBe(2) // week 27
    expect(trimesterForDay(190)).toBe(3) // week 28
  })

  it('survives a daylight-saving boundary', () => {
    // UK clocks go forward on 2026-03-29. A naive ms/86400000 division loses an
    // hour here and rounds a whole day off the count.
    const before = new Date('2026-03-28T00:00:00')
    const after = new Date('2026-03-30T00:00:00')
    expect(daysBetween(before, after)).toBe(2)
  })

  it('ignores the time of day', () => {
    const morning = new Date('2026-06-01T07:30:00')
    const night = new Date('2026-06-01T23:45:00')
    expect(dayOfPregnancy(DUE, morning)).toBe(dayOfPregnancy(DUE, night))
  })

  it('counts down to zero on the due date', () => {
    expect(daysRemaining(DUE, DUE)).toBe(0)
    expect(daysRemaining(DUE, dateForDay(DUE, 270))).toBe(10)
  })

  it('reports being overdue rather than running out of timeline', () => {
    const late = new Date(DUE)
    late.setDate(late.getDate() + 5)
    expect(timelineStatus(DUE, late)).toMatchObject({ state: 'overdue', daysOverdue: 5 })
  })

  it('reports a due date too far out as not yet started', () => {
    const early = lmpFromDueDate(DUE)
    early.setDate(early.getDate() - 3)
    // LMP itself is day 0 and has no content, so day 1 is still 4 days away.
    expect(timelineStatus(DUE, early)).toMatchObject({ state: 'before', daysUntilStart: 4 })
    expect(timelineStatus(DUE, lmpFromDueDate(DUE))).toMatchObject({ state: 'before', daysUntilStart: 1 })
  })
})
