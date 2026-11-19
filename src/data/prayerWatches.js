/**
 * The eight prayer watches: the day split into three-hour blocks, starting at
 * 6pm because the biblical day begins at evening (Genesis 1:5).
 *
 * Scripture names the night watches (Lamentations 2:19, Judges 7:19, Exodus
 * 14:24, Mark 13:35) and the day's hours of prayer (Acts 2:15, 10:9, 3:1). The
 * `focus` of each watch is the emphasis it is commonly taught with, drawn from
 * the passages listed beside it.
 *
 * Quotations are from the King James Version, which is in the public domain.
 * Other translations are under copyright and should not be pasted in here.
 *
 * `start` is the hour the watch opens (0-23); every watch lasts three hours.
 * The ids are stored in settings and synced, so never rename one.
 */
export const WATCH_LENGTH_HOURS = 3

export const PRAYER_WATCHES = [
  {
    id: 'w1',
    number: 1,
    name: 'First watch',
    start: 18,
    focus: 'Thanksgiving for the day and covering the night ahead',
    verse: {
      ref: 'Psalm 141:2',
      text: 'Let my prayer be set forth before thee as incense; and the lifting up of my hands as the evening sacrifice.'
    },
    references: [
      'Genesis 1:5',
      'Psalm 141:2',
      'Lamentations 2:19',
      'Matthew 14:23',
      'Mark 1:32–34'
    ],
    prompt:
      'Thank God for everything this day held, by name. Then commit the night into His hands — your home, your children and everyone who sleeps under your roof — and ask Him to set a watch over all of you until morning.'
  },
  {
    id: 'w2',
    number: 2,
    name: 'Second watch',
    start: 21,
    focus: 'Rest, protection, and hearing God in the night',
    verse: {
      ref: 'Psalm 4:8',
      text: 'I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety.'
    },
    references: ['Psalm 4:8', 'Psalm 127:2', 'Job 33:15–16', 'Psalm 63:6', 'Luke 6:12'],
    prompt:
      'Ask for peaceful, untroubled sleep for your family and protection over your home through the night. Invite God to speak to you in the night seasons, and lift up anyone you know who is awake tonight in pain or fear.'
  },
  {
    id: 'w3',
    number: 3,
    name: 'Third watch',
    start: 0,
    focus: 'Breakthrough, deliverance, and standing guard',
    verse: {
      ref: 'Acts 16:25',
      text: 'And at midnight Paul and Silas prayed, and sang praises unto God: and the prisoners heard them.'
    },
    references: [
      'Exodus 12:29',
      'Acts 16:25–26',
      'Psalm 119:62',
      'Matthew 25:6',
      'Luke 11:5–8',
      'Matthew 13:25'
    ],
    prompt:
      'At midnight, praise God first, as Paul and Silas did. Then stand guard over your family in prayer: ask Him to break every chain, close every door the enemy would use, and uproot anything sown against your children while others sleep.'
  },
  {
    id: 'w4',
    number: 4,
    name: 'Fourth watch',
    start: 3,
    focus: 'God stepping in, and setting the day before Him early',
    verse: {
      ref: 'Psalm 46:5',
      text: 'God is in the midst of her; she shall not be moved: God shall help her, and that right early.'
    },
    references: [
      'Exodus 14:24',
      'Matthew 14:25',
      'Mark 1:35',
      'Psalm 46:5',
      'Psalm 30:5',
      'Lamentations 3:22–23'
    ],
    prompt:
      'Before the day begins, ask God to come to you as Jesus came across the water in the fourth watch. Lay the coming day before Him, and ask for His help — right early — in every situation your family will face today.'
  },
  {
    id: 'w5',
    number: 5,
    name: 'Fifth watch',
    start: 6,
    focus: 'Committing the day and asking for direction',
    verse: {
      ref: 'Psalm 5:3',
      text: 'My voice shalt thou hear in the morning, O LORD; in the morning will I direct my prayer unto thee, and will look up.'
    },
    references: ['Psalm 5:3', 'Exodus 29:38–39', 'Psalm 90:14', 'Psalm 143:8', 'Proverbs 8:17'],
    prompt:
      'Give this day to God before it gets busy. Ask Him to order your steps and your children’s steps, to give each of you wisdom for what lies ahead, and to satisfy you early with His mercy.'
  },
  {
    id: 'w6',
    number: 6,
    name: 'Sixth watch',
    start: 9,
    focus: 'The power of the Holy Spirit, and fruitful work',
    verse: {
      ref: 'Acts 2:17',
      text: 'And it shall come to pass in the last days, saith God, I will pour out of my Spirit upon all flesh: and your sons and your daughters shall prophesy, and your young men shall see visions, and your old men shall dream dreams.'
    },
    references: ['Acts 2:1–4', 'Acts 2:15–17', 'Mark 15:25', 'Psalm 90:17', 'Matthew 20:3'],
    prompt:
      'At the hour the Spirit fell at Pentecost, ask Him to fill you afresh and to pour out His Spirit on your sons and daughters. Ask God to establish the work of your hands today and to give you favour in everything you put your hand to.'
  },
  {
    id: 'w7',
    number: 7,
    name: 'Seventh watch',
    start: 12,
    focus: 'Strength in the middle of the day, protection, and revelation',
    verse: {
      ref: 'Psalm 91:6',
      text: 'Nor for the pestilence that walketh in darkness; nor for the destruction that wasteth at noonday.'
    },
    references: ['Acts 10:9–16', 'Psalm 55:17', 'Psalm 91:5–6', 'Mark 15:33', 'John 4:6'],
    prompt:
      'Pause in the middle of the day, as Peter did on the housetop. Ask God for fresh strength for the rest of the day, protection for your family wherever they are right now, and ears to hear anything He wants to show you.'
  },
  {
    id: 'w8',
    number: 8,
    name: 'Eighth watch',
    start: 15,
    focus: 'Victory, completion, and closing the day well',
    verse: {
      ref: 'John 19:30',
      text: 'When Jesus therefore had received the vinegar, he said, It is finished: and he bowed his head, and gave up the ghost.'
    },
    references: [
      'Acts 3:1–8',
      'Acts 10:3, 30',
      'Matthew 27:45–50',
      '1 Kings 18:36–38',
      'Daniel 9:21'
    ],
    prompt:
      'At the hour Jesus declared “It is finished,” thank Him for the victory of the cross over every battle your family faces. Ask Him to bring today’s work to a good completion, and to answer by fire as He did for Elijah at this hour.'
  }
]

export const WATCH_IDS = PRAYER_WATCHES.map((w) => w.id)

export function watchById(id) {
  return PRAYER_WATCHES.find((w) => w.id === id) || null
}

/** "HH:MM" for a whole hour. */
export function hourTime(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

/** The default reminder time for a watch: the moment it opens. */
export function defaultWatchTime(watch) {
  return hourTime(watch.start)
}

/** Minutes after midnight for "HH:MM", or null. */
export function minutesOf(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || '').trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

/** True when a clock time falls inside the watch's three hours. */
export function timeInWatch(watch, time) {
  const minutes = minutesOf(time)
  if (minutes === null) return false
  const start = watch.start * 60
  return minutes >= start && minutes < start + WATCH_LENGTH_HOURS * 60
}

/** The watch a given moment belongs to. */
export function watchAt(date = new Date()) {
  const hour = date.getHours()
  return PRAYER_WATCHES.find((w) => hour >= w.start && hour < w.start + WATCH_LENGTH_HOURS)
}

/** "6pm–9pm" in the user's own clock style. */
export function watchWindowLabel(watch, locale) {
  return `${formatClock(watch.start * 60, locale)}–${formatClock(
    ((watch.start + WATCH_LENGTH_HOURS) % 24) * 60,
    locale
  )}`
}

/** A minutes-after-midnight value as the device would show it ("3:30 am"). */
export function formatClock(minutes, locale) {
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)
  const opts = { hour: 'numeric', hour12: true }
  if (minutes % 60) opts.minute = '2-digit'
  return d.toLocaleTimeString(locale, opts).replace(/\s+/g, '').toLowerCase()
}

/**
 * The settings value brought to shape: `{ w3: '00:30', ... }`, one entry per
 * watch the user has switched on. Unknown ids and times outside their watch
 * are dropped or reset, because the map arrives from synced (possibly older or
 * hand-edited) state.
 */
export function cleanWatchSelection(value) {
  const out = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const watch of PRAYER_WATCHES) {
    if (!(watch.id in value)) continue
    const time = value[watch.id]
    out[watch.id] = timeInWatch(watch, time) ? normaliseTime(time) : defaultWatchTime(watch)
  }
  return out
}

function normaliseTime(time) {
  const minutes = minutesOf(time)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
