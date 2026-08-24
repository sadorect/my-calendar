import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

/** An in-memory stand-in for the IndexedDB settings store. */
const saved = new Map()
vi.mock('@/services/database', () => ({
  getSetting: vi.fn(async (key) => saved.get(key) ?? null),
  setSetting: vi.fn(async (key, value) => {
    saved.set(key, value)
  })
}))

vi.mock('@/services/biometric', () => ({
  isBiometricAvailable: vi.fn(async () => false),
  enrolBiometric: vi.fn(async () => 'cred'),
  verifyBiometric: vi.fn(async () => true),
  requestPersistentStorage: vi.fn(async () => true),
  shouldRelock: vi.fn(() => false)
}))

const { usePregnancyStore } = await import('@/stores/pregnancy')
const { LEGACY_PROFILE_ID } = await import('@/services/familyState')
const { loadStageContent } = await import('@/data/family/index.js')

// The store fetches a stage's content when a profile in it is opened. Loading
// it up front keeps these tests synchronous.
await Promise.all(['school', 'teen'].map((stage) => loadStageContent(stage)))

describe('the pregnancy store, with several children', () => {
  let store

  beforeEach(async () => {
    saved.clear()
    setActivePinia(createPinia())
    store = usePregnancyStore()
    await store.load()
  })

  it('starts with no children at all', () => {
    expect(store.profiles).toHaveLength(0)
    expect(store.activeProfile).toBeNull()
    expect(store.isConfigured).toBe(false)
  })

  it('creates the womb child on first onboarding, with the shared id', async () => {
    await store.setDueDate(new Date(2026, 11, 1))
    expect(store.profiles).toHaveLength(1)
    expect(store.activeProfile.id).toBe(LEGACY_PROFILE_ID)
    expect(store.activeProfile.kind).toBe('womb')
    expect(store.isConfigured).toBe(true)
    expect(store.activeTrack).toBe('womb')
  })

  it('does not mint a second womb child when the due date changes', async () => {
    await store.setDueDate(new Date(2026, 11, 1))
    await store.setDueDate(new Date(2026, 11, 8))
    expect(store.profiles).toHaveLength(1)
    expect(store.dueDate.getDate()).toBe(8)
  })

  it('keeps each child’s journal, favourites and spoken days apart', async () => {
    await store.setDueDate(new Date(2026, 11, 1))
    await store.saveJournal(47, 'The first kick.')
    await store.toggleFavourite('day', 47)
    await store.toggleSpoken(47)

    const ada = await store.addProfile({ name: 'Ada', birthDate: '2015-04-02' })
    expect(store.activeProfile.id).toBe(ada.id)
    // A brand new child sees none of the other's history.
    expect(store.journalFor(47)).toBe('')
    expect(store.isFavourite('day', 47)).toBe(false)
    expect(store.isSpoken(47)).toBe(false)
    expect(store.spokenCount).toBe(0)

    await store.saveJournal('2026-08-20', 'Ada’s hard day at school.')
    await store.selectProfile(LEGACY_PROFILE_ID)
    expect(store.journalFor(47)).toBe('The first kick.')
    expect(store.journalFor('2026-08-20')).toBe('')

    await store.selectProfile(ada.id)
    expect(store.journalFor('2026-08-20')).toBe('Ada’s hard day at school.')
  })

  it('reads the name of whichever child is active', async () => {
    await store.setDueDate(new Date(2026, 11, 1))
    await store.setBabyName('Hope')
    const ada = await store.addProfile({ name: 'Ada', birthDate: '2015-04-02' })
    expect(store.babyName).toBe('Ada')
    await store.selectProfile(LEGACY_PROFILE_ID)
    expect(store.babyName).toBe('Hope')
    expect(store.personalise('Little one, you are known.')).toBe('Hope, you are known.')
    await store.selectProfile(ada.id)
    expect(store.personalise('Little one, you are known.')).toBe('Ada, you are known.')
  })

  it('derives the stage from age, and lets a parent override it', async () => {
    const ada = await store.addProfile({ name: 'Ada', birthDate: '2015-04-02' })
    expect(store.activeStage.id).toBe('school')
    expect(store.activeTrack).toBe('year')
    await store.updateProfile(ada.id, { stage: 'teen' })
    expect(store.activeStage.id).toBe('teen')
    await store.updateProfile(ada.id, { stage: 'auto' })
    expect(store.activeStage.id).toBe('school')
  })

  it('treats a born child with no birth date as unconfigured', async () => {
    await store.addProfile({ name: 'Nameless' })
    expect(store.isConfigured).toBe(false)
    expect(store.activeStage).toBeNull()
  })

  it('removes a child and everything they own, then falls back to another', async () => {
    await store.setDueDate(new Date(2026, 11, 1))
    const ada = await store.addProfile({ name: 'Ada', birthDate: '2015-04-02' })
    await store.saveJournal('2026-08-20', 'Gone after this.')

    expect(await store.removeProfile(ada.id)).toBe(true)
    expect(store.profiles).toHaveLength(1)
    expect(store.activeProfile.id).toBe(LEGACY_PROFILE_ID)
    expect(store.state.data[ada.id]).toBeUndefined()
    expect(await store.removeProfile('never-existed')).toBe(false)
  })

  it('survives removing the last child', async () => {
    const ada = await store.addProfile({ name: 'Ada', birthDate: '2015-04-02' })
    await store.removeProfile(ada.id)
    expect(store.activeProfile).toBeNull()
    expect(store.isConfigured).toBe(false)
    expect(() => store.journalFor(1)).not.toThrow()
  })

  it('refuses to switch to a child that is not there', async () => {
    await store.setDueDate(new Date(2026, 11, 1))
    expect(await store.selectProfile('ghost')).toBe(false)
    expect(store.activeProfile.id).toBe(LEGACY_PROFILE_ID)
  })

  it('persists across a reload, and reloads the same child', async () => {
    await store.setDueDate(new Date(2026, 11, 1))
    await store.setBabyName('Hope')
    const ada = await store.addProfile({ name: 'Ada', birthDate: '2015-04-02' })
    await store.saveJournal('2026-08-20', 'Kept.')

    setActivePinia(createPinia())
    const reloaded = usePregnancyStore()
    await reloaded.load()
    expect(reloaded.profiles).toHaveLength(2)
    expect(reloaded.activeProfile.id).toBe(ada.id)
    expect(reloaded.journalFor('2026-08-20')).toBe('Kept.')
    await reloaded.selectProfile(LEGACY_PROFILE_ID)
    expect(reloaded.babyName).toBe('Hope')
  })

  it('loads a version 1 blob straight into the womb child', async () => {
    saved.set('birthCalendar', {
      version: 1,
      dueDate: new Date(2026, 11, 1).toISOString(),
      babyName: 'Hope',
      favourites: { 'day:47': '2026-08-01T10:00:00.000Z' },
      journal: { 47: { text: 'From the old app.', updatedAt: '2026-08-01T10:00:00.000Z' } },
      spoken: { 47: '2026-08-01T08:00:00.000Z' },
      settings: { voice: 'partner' },
      updatedAt: '2026-08-01T10:00:00.000Z'
    })
    setActivePinia(createPinia())
    const migrated = usePregnancyStore()
    await migrated.load()

    expect(migrated.profiles).toHaveLength(1)
    expect(migrated.babyName).toBe('Hope')
    expect(migrated.isConfigured).toBe(true)
    expect(migrated.journalFor(47)).toBe('From the old app.')
    expect(migrated.isFavourite('day', 47)).toBe(true)
    expect(migrated.isSpoken(47)).toBe(true)
    expect(migrated.state.settings.voice).toBe('partner')
  })

  it('keeps writing the version 1 fields for devices that have not updated', async () => {
    await store.setDueDate(new Date(2026, 11, 1))
    await store.setBabyName('Hope')
    await store.saveJournal(47, 'Mirrored.')
    const blob = saved.get('birthCalendar')
    expect(blob.babyName).toBe('Hope')
    expect(blob.journal[47].text).toBe('Mirrored.')
  })

  it('mirrors the womb child even while another child is selected', async () => {
    await store.setDueDate(new Date(2026, 11, 1))
    await store.setBabyName('Hope')
    await store.addProfile({ name: 'Ada', birthDate: '2015-04-02' })
    await store.saveJournal('2026-08-20', 'Ada’s note.')

    const blob = saved.get('birthCalendar')
    // The mirror is the womb track and only the womb track — an old client must
    // never be shown one child's journal under another child's name.
    expect(blob.babyName).toBe('Hope')
    expect(blob.journal['2026-08-20']).toBeUndefined()
  })

  it('keeps the keepsake pointed at the child on screen', async () => {
    await store.setDueDate(new Date(2026, 11, 1))
    await store.setBabyName('Hope')
    const ada = await store.addProfile({ name: 'Ada', birthDate: '2015-04-02' })
    expect(store.activeAsLegacy.babyName).toBe('Ada')
    await store.selectProfile(LEGACY_PROFILE_ID)
    expect(store.activeAsLegacy.babyName).toBe('Hope')
    expect(ada.id).toBeTruthy()
  })
})

describe('the born-stage track', () => {
  let store

  beforeEach(async () => {
    saved.clear()
    setActivePinia(createPinia())
    store = usePregnancyStore()
    await store.load()
    await store.addProfile({ name: 'Ada', birthDate: '2015-04-02' })
  })

  it('reads the theme for the month it is on', async () => {
    store.selectStageDate(new Date(2027, 0, 3))
    expect(store.activeTheme.title).toBe('Identity & Belonging')
    expect(store.activeStagePosition).toMatchObject({ year: 2027, month: 1, day: 3, week: 1 })
    expect(store.activeStageDayContent.title).toBe('Wonderfully Made')
  })

  it('reads every month of the year, because all twelve are written', () => {
    for (let month = 1; month <= 12; month++) {
      store.selectStageDate(new Date(2027, month - 1, 3))
      expect(store.activeTheme.month, `month ${month}`).toBe(month)
      expect(store.activeStageDayContent, `month ${month}`).toBeTruthy()
      expect(store.activeStageWeekContent, `month ${month}`).toBeTruthy()
    }
  })

  it('shows nothing rather than the wrong thing for a stage not written', async () => {
    // A toddler has no content yet; the theme is still named, so the placeholder
    // can say which one is coming.
    await store.addProfile({ name: 'Nia', birthDate: '2024-03-01' })
    store.selectStageDate(new Date(2027, 5, 3))
    expect(store.activeStage.id).toBe('toddler')
    expect(store.activeTheme.title).toBe('Protection & Covering')
    expect(store.activeStageDayContent).toBeNull()
    expect(store.activeStageMonth).toBeNull()
  })

  it('steps whole months, and clamps rather than spilling into the next', () => {
    store.selectStageDate(new Date(2027, 0, 31))
    store.stepStageMonth(1)
    // 31 January + one month is February, which has no 31st.
    expect(store.activeStagePosition).toMatchObject({ year: 2027, month: 2, day: 28 })
    store.stepStageMonth(-1)
    expect(store.activeStagePosition.month).toBe(1)
  })

  it('steps across a year boundary', () => {
    store.selectStageDate(new Date(2027, 11, 15))
    store.stepStageMonth(1)
    expect(store.activeStagePosition).toMatchObject({ year: 2028, month: 1, day: 15 })
  })

  it('files favourites by position so they come back every year', async () => {
    store.selectStageDate(new Date(2027, 0, 3))
    await store.toggleStageFavourite('day', 3)
    expect(store.isStageFavourite('day', 3)).toBe(true)
    expect(store.state.data[store.activeProfile.id].favourites['school:m01:d03']).toBeTruthy()

    // A year later, the same theme day is still saved.
    store.selectStageDate(new Date(2028, 0, 3))
    expect(store.isStageFavourite('day', 3)).toBe(true)

    expect(store.stageFavourites).toHaveLength(1)
    expect(store.stageFavourites[0].entry.title).toBe('Wonderfully Made')
    expect(store.stageFavourites[0].theme.title).toBe('Identity & Belonging')
  })

  it('keeps one child’s stage favourites out of another’s', async () => {
    store.selectStageDate(new Date(2027, 0, 3))
    await store.toggleStageFavourite('day', 3)
    await store.addProfile({ name: 'Ben', birthDate: '2010-01-05' })
    store.selectStageDate(new Date(2027, 0, 3))
    // Ben is a teen, so even the same position is a different key.
    expect(store.isStageFavourite('day', 3)).toBe(false)
    expect(store.stageFavourites).toHaveLength(0)
    expect(store.activeStageDayContent.title).toBe('Made, Not Assembled')
  })

  it('files journal notes by real date, and keeps them out of the womb list', async () => {
    await store.saveJournal('2027-01-03', 'She asked whether God knows her name.')
    expect(store.stageJournalEntries).toHaveLength(1)
    expect(store.stageJournalEntries[0].key).toBe('2027-01-03')
    // The womb list is day-numbered and must not try to render a date as one.
    expect(store.journalEntries).toHaveLength(0)
  })

  it('counts a spoken streak back through calendar days', async () => {
    const today = new Date()
    const keyFor = (offset) => {
      const d = new Date(today)
      d.setDate(d.getDate() - offset)
      return store.dayKey(d)
    }
    await store.toggleSpoken(keyFor(0))
    await store.toggleSpoken(keyFor(1))
    await store.toggleSpoken(keyFor(2))
    expect(store.stageSpokenStreak).toBe(3)
    // A gap ends the streak rather than being counted through.
    await store.toggleSpoken(keyFor(4))
    expect(store.stageSpokenStreak).toBe(3)
  })

  it('lays out every day of the month being read', () => {
    store.selectStageDate(new Date(2027, 0, 15))
    const days = store.stageMonthDays
    expect(days).toHaveLength(31)
    expect(days[14].isToday).toBe(true)
    expect(days[0].entry.title).toBe('Known by Name')
    expect(days[0].key).toBe('2027-01-01')
  })

  it('offers four weekly cards, with the ranges a real month has', () => {
    store.selectStageDate(new Date(2027, 0, 15))
    const cards = store.stageWeekCards
    expect(cards.map((c) => c.week)).toEqual([1, 2, 3, 4])
    expect(cards[0]).toMatchObject({ start: 1, end: 7 })
    // Week four absorbs the tail rather than a fifth card being invented.
    expect(cards[3]).toMatchObject({ start: 22, end: 31 })
    expect(cards[3].entry.title).toBe('You Are His')
  })

  it('gives the womb child none of this', async () => {
    await store.setDueDate(new Date(2027, 5, 1))
    expect(store.activeTrack).toBe('womb')
    expect(store.activeStageDayContent).toBeNull()
    expect(store.stageWeekCards).toEqual([])
    expect(store.stageMonthDays).toEqual([])
    expect(store.stageThemes).toEqual([])
  })
})
