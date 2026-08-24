/**
 * Loads the born-stage content and makes it queryable by stage, theme and day.
 *
 * Content is plain JSON, one file per stage per theme, so it can be written,
 * edited or translated without touching application code — the same contract
 * the pregnancy content has. Most stage/theme combinations are not written yet;
 * a missing one is a normal, expected answer of `null`, not an error, and the
 * UI shows a gentle placeholder for it.
 */
import { THEMES, themeForMonth } from './themes.js'
import { WEEKS_PER_MONTH } from '../../services/stageTimeline.js'
import { paletteFor } from '../pregnancy/palettes.js'

import school01 from './stages/school/01-identity-and-belonging.json'
import teen01 from './stages/teen/01-identity-and-belonging.json'

/** stage id -> theme month -> month file. */
const CONTENT = {
  school: { 1: school01 },
  teen: { 1: teen01 }
}

const MAX_DAY = 31

/**
 * Fails loudly on a malformed content edit, at module load rather than in front
 * of a user. A theme file claiming the wrong month would silently show January's
 * declarations in March.
 */
function validate() {
  const problems = []

  for (const [stageId, months] of Object.entries(CONTENT)) {
    for (const [key, file] of Object.entries(months)) {
      const month = Number(key)
      const where = `${stageId} month ${month}`

      if (file.month !== month) problems.push(`${where}: file says month ${file.month}`)
      if (file.stage !== stageId) problems.push(`${where}: file says stage ${file.stage}`)

      const theme = themeForMonth(month)
      if (theme && file.slug !== theme.slug) {
        problems.push(`${where}: slug ${file.slug} does not match theme ${theme.slug}`)
      }

      const seenDays = new Set()
      for (const day of file.days || []) {
        if (day.day < 1 || day.day > MAX_DAY) problems.push(`${where}: day ${day.day} out of range`)
        if (seenDays.has(day.day)) problems.push(`${where}: day ${day.day} written twice`)
        seenDays.add(day.day)
        if (!day.title || !day.declaration) problems.push(`${where}: day ${day.day} is incomplete`)
      }
      // 28 is the floor because February must be covered; 29-31 are optional.
      for (let d = 1; d <= 28; d++) {
        if (!seenDays.has(d)) problems.push(`${where}: day ${d} is missing`)
      }

      const seenWeeks = new Set()
      for (const week of file.weeks || []) {
        if (week.week < 1 || week.week > WEEKS_PER_MONTH) {
          problems.push(`${where}: week ${week.week} out of range`)
        }
        if (seenWeeks.has(week.week)) problems.push(`${where}: week ${week.week} written twice`)
        seenWeeks.add(week.week)
        if (!week.declaration) problems.push(`${where}: week ${week.week} has no declaration`)
      }
      for (let w = 1; w <= WEEKS_PER_MONTH; w++) {
        if (!seenWeeks.has(w)) problems.push(`${where}: week ${w} is missing`)
      }
    }
  }

  if (problems.length) {
    throw new Error('Family content is inconsistent:\n  ' + problems.join('\n  '))
  }
}

validate()

/** The written month file for a stage and theme, or null if not written yet. */
export function stageMonthContent(stageId, month) {
  return CONTENT[stageId]?.[month] || null
}

export function stageDayContent(stageId, month, day) {
  const file = stageMonthContent(stageId, month)
  if (!file) return null
  const entry = file.days.find((d) => d.day === day)
  return entry ? { ...entry, month: file } : null
}

export function stageWeekContent(stageId, month, week) {
  const file = stageMonthContent(stageId, month)
  if (!file) return null
  const entry = file.weeks.find((w) => w.week === week)
  return entry ? { ...entry, month: file } : null
}

export function stagePalette(stageId, month) {
  const file = stageMonthContent(stageId, month)
  return paletteFor(file?.palette || themeForMonth(month)?.palette)
}

/** Every theme, marked with whether this stage has it written. */
export function themesForStage(stageId) {
  return THEMES.map((theme) => ({
    ...theme,
    written: Boolean(stageMonthContent(stageId, theme.month))
  }))
}

/** How much of a stage has been written — used by the About screen. */
export function stageCoverage(stageId) {
  const months = CONTENT[stageId] || {}
  const written = Object.keys(months).length
  return {
    monthsWritten: written,
    monthsTotal: THEMES.length,
    daysWritten: Object.values(months).reduce((n, m) => n + m.days.length, 0)
  }
}

export { THEMES, themeForMonth }
