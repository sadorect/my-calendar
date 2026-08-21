/**
 * Pregnancy date arithmetic.
 *
 * Deliberately pure and dependency-light: no store, no Vue, no side effects.
 * Every off-by-one in a pregnancy app is a real person being told the wrong
 * week, so this file is unit tested rather than eyeballed.
 *
 * Convention (the one midwives and every other pregnancy app use):
 *   - 280 days / 40 weeks, counted from the last menstrual period (LMP).
 *   - dueDate (EDD) = LMP + 280 days, which is 40w0d exactly.
 *   - "Day N" means N days since LMP, so day 280 IS the due date and day 1 is
 *     the day after LMP. Gestational age therefore reads 40w0d on the due date,
 *     matching what a midwife would say. Counting day 1 as the LMP itself is the
 *     tempting alternative and puts every user one day behind for 9 months.
 */

export const TOTAL_DAYS = 280
export const TOTAL_WEEKS = 40

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Midnight local time. Pregnancy days are calendar days, not 24h windows. */
export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Whole calendar days from `a` to `b`.
 *
 * Normalising to midnight first matters: a naive millisecond division gets the
 * wrong answer across a daylight-saving boundary, which in the UK would shift
 * every user's week twice a year.
 */
export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / MS_PER_DAY)
}

/** LMP implied by a due date. */
export function lmpFromDueDate(dueDate) {
  const d = startOfDay(dueDate)
  d.setDate(d.getDate() - TOTAL_DAYS)
  return d
}

/** Due date implied by an LMP. */
export function dueDateFromLmp(lmp) {
  const d = startOfDay(lmp)
  d.setDate(d.getDate() + TOTAL_DAYS)
  return d
}

/**
 * Due date implied by "I am currently X weeks and Y days pregnant" — the other
 * way people know where they are, and the reason onboarding offers both.
 */
export function dueDateFromCurrentProgress(weeks, days = 0, today = new Date()) {
  // "I am 24 weeks and 3 days" means 24 completed weeks — 171 days in.
  const day = weeks * 7 + days
  const lmp = startOfDay(today)
  lmp.setDate(lmp.getDate() - day)
  return dueDateFromLmp(lmp)
}

/**
 * Which day of pregnancy a date falls on. Not clamped: values outside 1..280
 * are real information (before conception, or overdue) and the caller decides
 * what to do with them.
 */
export function dayOfPregnancy(dueDate, date = new Date()) {
  return daysBetween(lmpFromDueDate(dueDate), date)
}

/** The calendar date of a given day of pregnancy. */
export function dateForDay(dueDate, day) {
  const d = lmpFromDueDate(dueDate)
  d.setDate(d.getDate() + day)
  return d
}

/** Gestational week (1-based) for a day of pregnancy. */
export function weekOfPregnancy(day) {
  return Math.ceil(day / 7)
}

/**
 * How pregnancy is actually spoken: "24 weeks and 3 days" — completed weeks
 * plus remainder days, which is one less than the 1-based week number.
 */
export function gestationalAge(day) {
  const clamped = Math.max(0, day)
  return {
    weeks: Math.floor(clamped / 7),
    days: clamped % 7,
  }
}

export function trimesterForDay(day) {
  const week = weekOfPregnancy(day)
  if (week <= 13) return 1
  if (week <= 27) return 2
  return 3
}

/** Days remaining until the due date. Negative once overdue. */
export function daysRemaining(dueDate, date = new Date()) {
  return TOTAL_DAYS - dayOfPregnancy(dueDate, date)
}

/** 0..1 progress through the pregnancy, clamped for display. */
export function progressFraction(day) {
  return Math.min(1, Math.max(0, day / TOTAL_DAYS))
}

export function isValidDueDate(value) {
  const d = new Date(value)
  return value != null && !Number.isNaN(d.getTime())
}

/**
 * A plain-language summary for the Today screen.
 *
 * Handles the three states that are easy to forget: not yet started (a due date
 * more than 280 days out), in progress, and overdue — where the app must not
 * simply run out of content and show a blank screen.
 */
export function timelineStatus(dueDate, date = new Date()) {
  const day = dayOfPregnancy(dueDate, date)

  if (day < 1) {
    return { state: 'before', day, daysUntilStart: 1 - day }
  }
  if (day > TOTAL_DAYS) {
    return { state: 'overdue', day, daysOverdue: day - TOTAL_DAYS }
  }
  return { state: 'active', day }
}
