/**
 * Date arithmetic for the born-stage tracks.
 *
 * The womb has a start and an end, so its content is addressed by a position on
 * a 280-day line. A child does not: they are in School Years for seven years.
 * So born-stage content is addressed by where the *calendar* is — one evergreen
 * theme per month, cycling every year — and this file is the whole of that
 * mapping.
 *
 * Pure and dependency-light for the same reason `pregnancyTimeline.js` is: an
 * off-by-one here shows somebody the wrong declaration over their child.
 */

export const THEME_COUNT = 12
export const WEEKS_PER_MONTH = 4

/** Midnight local time. These are calendar days, not 24h windows. */
export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Days in a given month. `month` is 1-based, unlike `Date`. */
export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

/**
 * Which of the four weekly declarations covers a day.
 *
 * Days 1–7 are week 1, 8–14 week 2, 15–21 week 3, and everything from 22 to the
 * end of the month is week 4. The last "week" is therefore 7 to 10 days long,
 * which is the honest way to put four cards on a month rather than inventing a
 * fifth that most months would not fill.
 */
export function weekOfMonth(day) {
  return Math.min(WEEKS_PER_MONTH, Math.ceil(day / 7))
}

/** First and last day-of-month covered by a weekly card. */
export function weekRange(week, year, month) {
  const start = (week - 1) * 7 + 1
  const end = week === WEEKS_PER_MONTH ? daysInMonth(year, month) : week * 7
  return { start, end }
}

/** Where the calendar is: the theme month, the day in it, and the week. */
export function stagePosition(date = new Date()) {
  const d = startOfDay(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  return { year: d.getFullYear(), month, day, week: weekOfMonth(day) }
}

export function dateForPosition({ year, month, day }) {
  return startOfDay(new Date(year, month - 1, Math.min(day, daysInMonth(year, month))))
}

/**
 * The key a saved day, spoken day or journal entry is filed under.
 *
 * A real date, not a position: a note about your teenager belongs to the day it
 * happened, and would be nonsense if it reappeared under the same slot a year
 * later. `YYYY-MM-DD` in local time, so it matches what the user saw on screen
 * rather than what UTC thought at the time.
 */
export function dayKey(date = new Date()) {
  const d = startOfDay(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function dateFromDayKey(key) {
  const [y, m, d] = String(key || '')
    .split('-')
    .map(Number)
  if (!y || !m || !d) return null
  return startOfDay(new Date(y, m - 1, d))
}

/**
 * Favourite keys, which *are* positions rather than dates.
 *
 * Saving a declaration means "this one is worth coming back to", and it comes
 * back every year — so it is filed by stage, theme and day, and survives the
 * calendar rolling over.
 */
export function dayFavouriteKey(stageId, month, day) {
  return `${stageId}:m${String(month).padStart(2, '0')}:d${String(day).padStart(2, '0')}`
}

export function weekFavouriteKey(stageId, month, week) {
  return `${stageId}:m${String(month).padStart(2, '0')}:w${week}`
}

/** How far through the month we are, 0..1 — the ring on the Today screen. */
export function monthProgress({ year, month, day }) {
  return Math.min(1, Math.max(0, day / daysInMonth(year, month)))
}
