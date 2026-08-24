/**
 * Loads the born-stage content, one stage at a time and only when it is needed.
 *
 * Content is plain JSON, one file per stage per theme, so it can be written,
 * edited or translated without touching application code — the same contract
 * the pregnancy content has.
 *
 * ## Why this is lazy, when the pregnancy content is not
 *
 * The pregnancy store is imported by `App.vue`, so everything the store imports
 * statically lands in the eagerly loaded bundle. That is survivable for one
 * pregnancy — 280 days, written once. It is not survivable here: a finished
 * stage is 372 daily declarations, and there are six stages. Imported
 * statically, every visitor would download the whole family's content before
 * first paint, including the five stages they have no child in.
 *
 * So each stage is its own lazy chunk, fetched the first time a profile in that
 * stage is opened and cached from then on. Lookups stay synchronous and simply
 * answer `null` until the fetch resolves — the same answer they already give
 * for a stage nobody has written, so the UI needs no new state to handle it.
 */
import { THEMES, themeForMonth } from './themes.js'
import { WEEKS_PER_MONTH } from '../../services/stageTimeline.js'
import { paletteFor } from '../pregnancy/palettes.js'

/**
 * Every content file, as an importer function rather than as content.
 *
 * `import.meta.glob` without `eager` gives Vite a set of dynamic imports it can
 * split into their own chunks, and it means adding a month file needs no edit
 * here — dropping the JSON into the right directory is the whole step.
 */
const FILES = import.meta.glob('./stages/*/*.json')

const PATH = /^\.\/stages\/([^/]+)\/(\d{2})-[^/]+\.json$/

/** stage id -> theme month -> month file, for stages that have been loaded. */
const CONTENT = {}
/** stage id -> in-flight promise, so opening twice does not fetch twice. */
const PENDING = {}

const MAX_DAY = 31

/** Which stages have content on disk, whether or not it has been loaded yet. */
export const STAGES_WITH_CONTENT = [
  ...new Set(
    Object.keys(FILES)
      .map((path) => PATH.exec(path)?.[1])
      .filter(Boolean)
  )
].sort()

export function stageHasContent(stageId) {
  return STAGES_WITH_CONTENT.includes(stageId)
}

export function isStageLoaded(stageId) {
  return Boolean(CONTENT[stageId])
}

/**
 * Fails loudly on a malformed content edit, at load rather than in front of a
 * user. A theme file claiming the wrong month would silently show January's
 * declarations in March.
 */
function validate(stageId, months) {
  const problems = []

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

  if (problems.length) {
    throw new Error(`Family content for ${stageId} is inconsistent:\n  ` + problems.join('\n  '))
  }
}

/**
 * Fetches one stage's month files and caches them.
 *
 * Resolves to `false` for a stage nobody has written, so a caller can treat
 * "not written" and "written but not here yet" the same way. Safe to call
 * repeatedly and safe to call concurrently.
 */
export async function loadStageContent(stageId) {
  if (CONTENT[stageId]) return true
  if (!stageHasContent(stageId)) return false
  if (PENDING[stageId]) return PENDING[stageId]

  const pending = (async () => {
    const months = {}
    const entries = Object.entries(FILES).filter(([path]) => PATH.exec(path)?.[1] === stageId)
    await Promise.all(
      entries.map(async ([path, importer]) => {
        const month = Number(PATH.exec(path)[2])
        const module = await importer()
        months[month] = module.default || module
      })
    )
    validate(stageId, months)
    CONTENT[stageId] = months
    return true
  })()

  PENDING[stageId] = pending
  try {
    return await pending
  } finally {
    delete PENDING[stageId]
  }
}

/**
 * The written month file for a stage and theme.
 *
 * Null when the stage has not been loaded yet as well as when nobody has
 * written it — deliberately the same answer, because the UI's response to both
 * is the same gentle placeholder.
 */
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

/** Every theme, marked with whether this stage has it loaded. */
export function themesForStage(stageId) {
  return THEMES.map((theme) => ({
    ...theme,
    written: Boolean(stageMonthContent(stageId, theme.month))
  }))
}

/** How much of a stage is loaded — used by the About screen. */
export function stageCoverage(stageId) {
  const months = CONTENT[stageId] || {}
  return {
    monthsWritten: Object.keys(months).length,
    monthsTotal: THEMES.length,
    daysWritten: Object.values(months).reduce((n, m) => n + m.days.length, 0)
  }
}

export { THEMES, themeForMonth }
