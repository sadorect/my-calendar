/**
 * The twelve evergreen monthly themes.
 *
 * The same twelve for every born stage — only the wording of the declarations
 * changes with the stage. They are ordered to match the calendar months, so
 * March is always Wisdom & Discernment whatever year it is and whatever stage
 * the child is in; a family with a nine-year-old and a fifteen-year-old are
 * praying the same theme over both.
 *
 * Palettes are borrowed from the pregnancy set so the whole app stays in one
 * visual key, and are arranged to move through the year rather than to match
 * any northern-hemisphere season — this app is used where March is hot.
 */
export const THEMES = [
  { month: 1, slug: 'identity-and-belonging', title: 'Identity & Belonging', palette: 'dawn' },
  {
    month: 2,
    slug: 'love-and-healthy-relationships',
    title: 'Love & Healthy Relationships',
    palette: 'blush'
  },
  { month: 3, slug: 'wisdom-and-discernment', title: 'Wisdom & Discernment', palette: 'ocean' },
  { month: 4, slug: 'courage-and-strength', title: 'Courage & Strength', palette: 'amber' },
  { month: 5, slug: 'purpose-and-calling', title: 'Purpose & Calling', palette: 'meadow' },
  { month: 6, slug: 'protection-and-covering', title: 'Protection & Covering', palette: 'ocean' },
  { month: 7, slug: 'joy-and-gratitude', title: 'Joy & Gratitude', palette: 'amber' },
  { month: 8, slug: 'character-and-integrity', title: 'Character & Integrity', palette: 'meadow' },
  { month: 9, slug: 'resilience-and-hope', title: 'Resilience & Hope', palette: 'twilight' },
  { month: 10, slug: 'generosity-and-legacy', title: 'Generosity & Legacy', palette: 'amber' },
  { month: 11, slug: 'peace-and-rest', title: 'Peace & Rest', palette: 'twilight' },
  { month: 12, slug: 'renewal-and-fresh-vision', title: 'Renewal & Fresh Vision', palette: 'dawn' }
]

export function themeForMonth(month) {
  return THEMES.find((t) => t.month === month) || null
}
