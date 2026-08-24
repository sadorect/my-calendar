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
