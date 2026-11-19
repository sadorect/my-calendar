/**
 * The prayer watches as entries in the phone's own calendar.
 *
 * This is the reliable path for the night watches. The app cannot wake itself
 * at 3am without a push server; the phone's calendar can, and nothing leaves
 * the device to make it happen.
 *
 * Two shapes, because no single one works everywhere:
 *  - an .ics file (Apple Calendar, Samsung Calendar, Outlook, and Google
 *    Calendar on a computer), with every selected watch as a daily repeating
 *    event that alerts at its start;
 *  - a Google Calendar "add event" link per watch, because the Google Calendar
 *    app on Android does not reliably open .ics files.
 *
 * Times are "floating" (no time zone), so they mean the same clock time
 * wherever the phone is — which is what a prayer watch is.
 */
import {
  PRAYER_WATCHES,
  cleanWatchSelection,
  minutesOf,
  watchWindowLabel
} from '../data/prayerWatches.js'

const EVENT_MINUTES = 15
const APP_URL = 'https://my-birthcalendar.vercel.app'

function pad(n) {
  return String(n).padStart(2, '0')
}

/** Local floating date-time, e.g. 20261119T033000. */
function floating(date) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  )
}

function utcStamp(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/** RFC 5545 text escaping. */
export function escapeText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Folds a content line at 75 octets, as RFC 5545 requires. */
export function foldLine(line) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const parts = []
  let current = ''
  let size = 0
  for (const char of line) {
    const charSize = new TextEncoder().encode(char).length
    const limit = parts.length ? 74 : 75 // continuation lines start with a space
    if (size + charSize > limit) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += char
    size += charSize
  }
  parts.push(current)
  return parts.join('\r\n ')
}

/** The first occurrence on or after `from`'s calendar day. */
function firstStart(time, from) {
  const minutes = minutesOf(time)
  const start = new Date(from)
  start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return start
}

function description(watch) {
  return [
    watch.focus + '.',
    '',
    `“${watch.verse.text}” — ${watch.verse.ref}`,
    '',
    watch.prompt,
    '',
    `Read also: ${watch.references.join('; ')}`,
    '',
    `${APP_URL}/?calendar=birth&watch=${watch.id}`
  ].join('\n')
}

function summary(watch) {
  return `${watch.name} of prayer (${watchWindowLabel(watch)})`
}

/** The selected watches in day order, starting from the first watch at 6pm. */
function selectedWatches(selection) {
  const chosen = cleanWatchSelection(selection)
  return PRAYER_WATCHES.filter((w) => chosen[w.id]).map((watch) => ({
    watch,
    time: chosen[watch.id]
  }))
}

export function buildWatchCalendar(selection, { now = new Date() } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Birth Calendar//Prayer watches//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Prayer watches'
  ]
  for (const { watch, time } of selectedWatches(selection)) {
    const start = firstStart(time, now)
    const end = new Date(start.getTime() + EVENT_MINUTES * 60 * 1000)
    lines.push(
      'BEGIN:VEVENT',
      // Stable per watch, so importing a newer file can replace the old event
      // in calendars that honour UID.
      `UID:prayer-watch-${watch.id}@my-birthcalendar.vercel.app`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${floating(start)}`,
      `DTEND:${floating(end)}`,
      'RRULE:FREQ=DAILY',
      `SUMMARY:${escapeText(summary(watch))}`,
      `DESCRIPTION:${escapeText(description(watch))}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(`${watch.name}: ${watch.focus}`)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** A Google Calendar link that opens a pre-filled, daily repeating event. */
export function googleCalendarLink(watch, time, { now = new Date() } = {}) {
  const start = firstStart(time, now)
  const end = new Date(start.getTime() + EVENT_MINUTES * 60 * 1000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary(watch),
    dates: `${floating(start)}/${floating(end)}`,
    details: description(watch),
    recur: 'RRULE:FREQ=DAILY'
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function selectedWatchLinks(selection, options) {
  return selectedWatches(selection).map(({ watch, time }) => ({
    watch,
    url: googleCalendarLink(watch, time, options)
  }))
}

/** Saves the .ics through a temporary link. */
export function downloadWatchCalendar(selection) {
  const blob = new Blob([buildWatchCalendar(selection)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'prayer-watches.ics'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
