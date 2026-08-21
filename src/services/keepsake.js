/**
 * Builds the printable keepsake: the whole pregnancy as a document.
 *
 * There is no PDF library here on purpose. The browser's own print pipeline
 * produces better typography than a canvas-drawn PDF, handles pagination and
 * hyphenation properly, and "Save as PDF" is available in every print dialog on
 * desktop and mobile. What this file owns is *what goes in* and in what order —
 * pure data, so it can be tested without rendering anything.
 */
import { MONTHS, dayContent, weekContent } from '../data/pregnancy/index.js'
import { dateForDay, gestationalAge } from './pregnancyTimeline.js'

export const KEEPSAKE_SECTIONS = [
  { id: 'declarations', label: 'Every daily declaration', hint: 'All 280 days. The full book.' },
  { id: 'weeks', label: 'Weekly declarations and prayers', hint: 'One page per week.' },
  {
    id: 'favourites',
    label: 'The ones you saved',
    hint: 'Your favourites, in the order you saved them.'
  },
  { id: 'journal', label: 'Your journal', hint: 'Everything you wrote, by day.' }
]

export const DEFAULT_SECTIONS = ['favourites', 'journal', 'weeks']

/** Resolves the voice the same way the app does, so print matches screen. */
function voiced(entry, voice, babyName) {
  const text = voice === 'partner' && entry.partner ? entry.partner : entry.declaration
  const name = String(babyName || '').trim()
  return name ? text.replace(/Little one/g, name) : text
}

/** "20 weeks, 3 days" — the same reckoning the rest of the app uses. */
function ageLabel(day) {
  const { weeks, days } = gestationalAge(day)
  const w = `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  return days ? `${w}, ${days} ${days === 1 ? 'day' : 'days'}` : w
}

function formatDate(date) {
  if (!date) return ''
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * @param {object} state    the pregnancy store's raw state blob
 * @param {string[]} sections  which sections to include, in KEEPSAKE_SECTIONS order
 * @returns {{cover: object, sections: Array}}
 */
export function buildKeepsake(state, sections = DEFAULT_SECTIONS) {
  const { babyName, dueDate, journal = {}, favourites = {}, spoken = {} } = state || {}
  const voice = state?.settings?.voice || 'parents'
  const due = dueDate ? new Date(dueDate) : null
  const dateFor = (day) => (due ? dateForDay(due, day) : null)

  const chosen = KEEPSAKE_SECTIONS.filter((s) => sections.includes(s.id))
  const built = []

  for (const section of chosen) {
    if (section.id === 'declarations') {
      built.push({
        id: 'declarations',
        title: 'The Daily Declarations',
        months: MONTHS.map((month) => ({
          month: month.month,
          title: month.title,
          intro: month.intro,
          keyScripture: month.keyScripture,
          weeks: `Weeks ${month.startWeek}–${month.endWeek}`,
          days: month.days.map((entry) => ({
            day: entry.day,
            title: entry.title,
            text: voiced(entry, voice, babyName),
            scripture: entry.scripture,
            age: ageLabel(entry.day),
            date: formatDate(dateFor(entry.day)),
            spoken: Boolean(spoken[entry.day])
          }))
        }))
      })
    }

    if (section.id === 'weeks') {
      const weeks = []
      for (const month of MONTHS) {
        for (let w = month.startWeek; w <= month.endWeek; w++) {
          const entry = weekContent(w)
          if (entry) {
            weeks.push({
              week: w,
              monthTitle: month.title,
              title: entry.title,
              declaration: voiced({ declaration: entry.declaration }, voice, babyName),
              parentsPrayer: entry.parentsPrayer
            })
          }
        }
      }
      built.push({ id: 'weeks', title: 'Week by Week', weeks })
    }

    if (section.id === 'favourites') {
      const items = Object.entries(favourites)
        .map(([key, savedAt]) => {
          const [kind, rawId] = key.split(':')
          const id = Number(rawId)
          const entry = kind === 'day' ? dayContent(id) : weekContent(id)
          if (!entry) return null
          return {
            kind,
            id,
            savedAt,
            title: entry.title,
            text:
              kind === 'day'
                ? voiced(entry, voice, babyName)
                : voiced({ declaration: entry.declaration }, voice, babyName),
            scripture: entry.scripture || null,
            label: kind === 'day' ? `Day ${id}` : `Week ${id}`,
            date: kind === 'day' ? formatDate(dateFor(id)) : ''
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt))
      built.push({ id: 'favourites', title: 'The Ones You Saved', items })
    }

    if (section.id === 'journal') {
      const entries = Object.entries(journal)
        .map(([day, entry]) => ({
          day: Number(day),
          text: entry?.text || '',
          updatedAt: entry?.updatedAt || null,
          date: formatDate(dateFor(Number(day))),
          age: ageLabel(Number(day)),
          declarationTitle: dayContent(Number(day))?.title || ''
        }))
        .filter((e) => e.text.trim())
        .sort((a, b) => a.day - b.day)
      built.push({ id: 'journal', title: 'Your Journal', entries })
    }
  }

  return {
    cover: {
      babyName: String(babyName || '').trim(),
      dueDate: formatDate(due),
      spokenCount: Object.keys(spoken).length,
      journalCount: Object.values(journal).filter((e) => e?.text?.trim()).length,
      favouriteCount: Object.keys(favourites).length,
      printedOn: formatDate(new Date())
    },
    sections: built
  }
}

/** Rough page estimate, so the UI can warn before someone prints 300 pages. */
export function estimatePages(keepsake) {
  let pages = 1
  for (const section of keepsake.sections) {
    if (section.id === 'declarations') {
      pages += 9 // month title pages
      pages += Math.ceil(section.months.reduce((n, m) => n + m.days.length, 0) / 4)
    }
    if (section.id === 'weeks') pages += Math.ceil(section.weeks.length / 3)
    if (section.id === 'favourites') pages += Math.ceil(section.items.length / 4) || 1
    if (section.id === 'journal') pages += Math.ceil(section.entries.length / 3) || 1
  }
  return pages
}
