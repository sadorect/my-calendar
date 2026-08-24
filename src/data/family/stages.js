/**
 * The life stages a child profile can be in.
 *
 * A stage decides which content track a profile reads, and there are exactly
 * two kinds of track:
 *
 *   'womb'  — addressed by day of pregnancy, 1..280, over nine unequal
 *             pregnancy months. Finite: it ends at birth. This is the original
 *             Birth Calendar and its content and date maths are untouched.
 *   'year'  — addressed by calendar month (1..12, one evergreen theme each) and
 *             day of that month. Unbounded and repeating: a child is in
 *             "School Years" for seven years, so the content cycles annually.
 *
 * Ranges are in whole months of age and half-open — `[minMonths, maxMonths)` —
 * so a child turning 13 moves from School to Teen on their birthday and cannot
 * be in two stages at once. The spec's ranges overlap at 18 and 30 ("13–18",
 * "18–30", "30+"); the birthday belongs to the older stage.
 */

export const STAGES = [
  {
    id: 'womb',
    track: 'womb',
    label: 'In the Womb',
    short: 'Womb',
    blurb: 'Before birth — the 280-day journey.',
    minMonths: null,
    maxMonths: null
  },
  {
    id: 'infant',
    track: 'year',
    label: 'Infant & First Year',
    short: 'Infant',
    blurb: 'Birth to the first birthday.',
    minMonths: 0,
    maxMonths: 12
  },
  {
    id: 'toddler',
    track: 'year',
    label: 'Toddler & Early Childhood',
    short: 'Toddler',
    blurb: 'One to five.',
    minMonths: 12,
    maxMonths: 72
  },
  {
    id: 'school',
    track: 'year',
    label: 'School Years',
    short: 'School',
    blurb: 'Six to twelve.',
    minMonths: 72,
    maxMonths: 156
  },
  {
    id: 'teen',
    track: 'year',
    label: 'Teen Years',
    short: 'Teen',
    blurb: 'Thirteen to seventeen.',
    minMonths: 156,
    maxMonths: 216
  },
  {
    id: 'youngAdult',
    track: 'year',
    label: 'Young Adult & Launching',
    short: 'Young adult',
    blurb: 'Eighteen to twenty-nine.',
    minMonths: 216,
    maxMonths: 360
  },
  {
    id: 'adult',
    track: 'year',
    label: 'Adult Children',
    short: 'Adult',
    blurb: 'Thirty and beyond.',
    minMonths: 360,
    maxMonths: null
  }
]

export const STAGE_IDS = STAGES.map((s) => s.id)

/** Stages a born child can be in, in order — what the stage picker offers. */
export const BORN_STAGES = STAGES.filter((s) => s.track === 'year')

export function stageById(id) {
  return STAGES.find((s) => s.id === id) || null
}

export function isStageId(id) {
  return STAGE_IDS.includes(id)
}

/**
 * Whole months from `birthDate` to `at`, never negative.
 *
 * Counts completed months the way people do: a child born on the 30th is one
 * month old on the 30th of the next month, and on the 28th of February for a
 * month that has no 30th — the same clamping every date library argues about,
 * decided here in favour of "the birthday has happened".
 */
export function ageInMonths(birthDate, at = new Date()) {
  const b = new Date(birthDate)
  const now = new Date(at)
  if (Number.isNaN(b.getTime()) || Number.isNaN(now.getTime())) return null

  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  // Not yet reached the day-of-month this month: the last month is incomplete.
  if (now.getDate() < b.getDate()) {
    const daysInNowMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    // Unless the target day does not exist in this month at all, in which case
    // the last day of the month is the birthday.
    if (!(b.getDate() > daysInNowMonth && now.getDate() === daysInNowMonth)) months -= 1
  }
  return Math.max(0, months)
}

/** The stage a born child of this age belongs to. Never returns the womb. */
export function stageForAgeInMonths(months) {
  if (months == null) return null
  return (
    BORN_STAGES.find(
      (s) => months >= s.minMonths && (s.maxMonths == null || months < s.maxMonths)
    ) || BORN_STAGES[BORN_STAGES.length - 1]
  )
}

/**
 * The stage a profile is actually in right now.
 *
 * `stage: 'auto'` is the default for a born child and follows their age, so a
 * child crossing a boundary moves track on their birthday without anyone
 * editing anything. An explicit stage always wins: a parent who wants their
 * eleven-year-old on the Teen track is not overruled by arithmetic.
 */
export function resolveStage(profile, at = new Date()) {
  if (!profile) return null
  if (profile.kind === 'womb') return stageById('womb')
  if (profile.stage && profile.stage !== 'auto') {
    return stageById(profile.stage) || stageForAgeInMonths(ageInMonths(profile.birthDate, at))
  }
  if (!profile.birthDate) return null
  return stageForAgeInMonths(ageInMonths(profile.birthDate, at))
}
