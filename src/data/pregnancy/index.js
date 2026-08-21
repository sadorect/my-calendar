/**
 * Loads the pregnancy content and makes it queryable by day, week or month.
 *
 * The month files are the source of truth for the timeline, not this file, so a
 * content edit that breaks the ranges must be caught here rather than showing a
 * user the wrong week. `validate()` runs once at module load.
 */
import { TOTAL_DAYS, TOTAL_WEEKS, weekOfPregnancy } from '../../services/pregnancyTimeline.js'
import { paletteFor } from './palettes.js'

import m1 from './months/01-known-and-chosen.json'
import m2 from './months/02-knit-together.json'
import m3 from './months/03-alive-with-purpose.json'
import m4 from './months/04-growing-strong.json'
import m5 from './months/05-sensing-and-responding.json'
import m6 from './months/06-rooted-in-his-plans.json'
import m7 from './months/07-protected-and-strengthened.json'
import m8 from './months/08-preparing-for-life-outside.json'
import m9 from './months/09-ready-to-be-born.json'

export const MONTHS = [m1, m2, m3, m4, m5, m6, m7, m8, m9]

/** Flat day -> entry map. Days without written content are simply absent. */
const dayIndex = new Map()
/** Flat gestational week -> { week entry, month } map. */
const weekIndex = new Map()

for (const month of MONTHS) {
  for (const day of month.days) {
    dayIndex.set(day.day, { ...day, month })
  }
  for (const week of month.weeks) {
    weekIndex.set(week.week, { ...week, month })
  }
}

/**
 * Fails loudly on a malformed content edit. A silently wrong range would put
 * every user on the wrong day for the rest of the pregnancy, which is exactly
 * the kind of bug nobody notices until it has been wrong for weeks.
 */
function validate() {
  const problems = []

  let expectedStart = 1
  for (const m of MONTHS) {
    if (m.startDay !== expectedStart) {
      problems.push(`Month ${m.month} starts at day ${m.startDay}, expected ${expectedStart}`)
    }
    if (m.endDay < m.startDay) {
      problems.push(`Month ${m.month} ends before it starts`)
    }
    for (const d of m.days) {
      if (d.day < m.startDay || d.day > m.endDay) {
        problems.push(`Month ${m.month} contains day ${d.day}, outside its range ${m.startDay}-${m.endDay}`)
      }
    }
    for (const w of m.weeks) {
      if (w.week < m.startWeek || w.week > m.endWeek) {
        problems.push(`Month ${m.month} contains week ${w.week}, outside its range ${m.startWeek}-${m.endWeek}`)
      }
    }
    expectedStart = m.endDay + 1
  }

  const lastDay = MONTHS[MONTHS.length - 1].endDay
  if (lastDay !== TOTAL_DAYS) {
    problems.push(`Months cover ${lastDay} days, expected ${TOTAL_DAYS}`)
  }

  if (problems.length) {
    throw new Error('Pregnancy content is inconsistent:\n  ' + problems.join('\n  '))
  }
}

validate()

export function monthForDay(day) {
  return MONTHS.find((m) => day >= m.startDay && day <= m.endDay) || null
}

export function monthByNumber(number) {
  return MONTHS.find((m) => m.month === number) || null
}

export function dayContent(day) {
  return dayIndex.get(day) || null
}

export function weekContent(week) {
  return weekIndex.get(week) || null
}

/** The week entry covering a given day, if one has been written. */
export function weekContentForDay(day) {
  return weekContent(weekOfPregnancy(day))
}

/** Every day number belonging to a month, whether or not content exists yet. */
export function dayNumbersInMonth(month) {
  const days = []
  for (let d = month.startDay; d <= month.endDay; d++) days.push(d)
  return days
}

export function monthPalette(month) {
  return paletteFor(month?.palette)
}

/** How much of the content has actually been written — used by the About screen. */
export function contentCoverage() {
  const written = MONTHS.filter((m) => m.days.length > 0)
  return {
    monthsWritten: written.length,
    monthsTotal: MONTHS.length,
    daysWritten: dayIndex.size,
    daysTotal: TOTAL_DAYS,
    weeksWritten: weekIndex.size,
    weeksTotal: TOTAL_WEEKS,
  }
}
