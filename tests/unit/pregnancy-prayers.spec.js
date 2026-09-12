import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

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

describe('the prayer journal in the store', () => {
  let store

  beforeEach(async () => {
    saved.clear()
    setActivePinia(createPinia())
    store = usePregnancyStore()
    await store.load()
  })

  it('starts empty', () => {
    expect(store.prayers).toEqual([])
    expect(store.openPrayerCount).toBe(0)
  })

  it('adds a prayer, trimmed, and refuses a blank one', async () => {
    expect(await store.addPrayer({ text: '   ' })).toBeNull()
    const prayer = await store.addPrayer({ text: '  A peaceful night  ' })
    expect(prayer.text).toBe('A peaceful night')
    expect(store.openPrayerCount).toBe(1)
    expect(store.prayers[0].id).toBe(prayer.id)
  })

  it('links a prayer to a child only if that child exists', async () => {
    const child = await store.addProfile({ name: 'Ada', birthDate: '2018-01-01' })
    const linked = await store.addPrayer({ text: 'For Ada', profileId: child.id })
    const orphan = await store.addPrayer({ text: 'For nobody', profileId: 'ghost' })
    expect(linked.profileId).toBe(child.id)
    expect(orphan.profileId).toBeNull()
    expect(store.prayersFor(child.id).map((p) => p.id)).toEqual([linked.id])
  })

  it('unlinks, rather than deletes, prayers of a removed child', async () => {
    const child = await store.addProfile({ name: 'Ada', birthDate: '2018-01-01' })
    const prayer = await store.addPrayer({ text: 'For Ada', profileId: child.id })
    await store.removeProfile(child.id)
    expect(store.prayerById(prayer.id).profileId).toBeNull()
    expect(store.prayers).toHaveLength(1)
  })

  it('marks answered with the answer, and can reopen', async () => {
    const prayer = await store.addPrayer({ text: 'A job' })
    await store.markAnswered(prayer.id, ' Offer came Tuesday ')
    expect(store.openPrayerCount).toBe(0)
    expect(store.answeredPrayers[0].answer).toBe('Offer came Tuesday')
    expect(store.answeredPrayers[0].answeredAt).toBeTruthy()
    await store.reopenPrayer(prayer.id)
    expect(store.openPrayerCount).toBe(1)
    expect(store.prayerById(prayer.id).answeredAt).toBeNull()
  })

  it('edits text and answer but never to blank text', async () => {
    const prayer = await store.addPrayer({ text: 'Original' })
    expect(await store.updatePrayer(prayer.id, { text: '' })).toBe(false)
    expect(await store.updatePrayer(prayer.id, { text: 'Changed' })).toBe(true)
    expect(store.prayerById(prayer.id).text).toBe('Changed')
  })

  it('deletes with a tombstone that persists', async () => {
    const prayer = await store.addPrayer({ text: 'Gone soon' })
    await store.deletePrayer(prayer.id)
    expect(store.prayers).toEqual([])
    expect(store.prayerById(prayer.id)).toBeNull()
    const blob = saved.get('pregnancy-state') ?? [...saved.values()].pop()
    expect(blob.prayers[prayer.id].deletedAt).toBeTruthy()
    expect(await store.markAnswered(prayer.id)).toBe(false)
  })

  it('finds an open prayer by the declaration it came from', async () => {
    const source = { stage: 'school', key: 'school:m03:d17', title: 'Wise' }
    const prayer = await store.addPrayer({ text: 'Wisdom', source })
    expect(store.prayerForSource('school:m03:d17').id).toBe(prayer.id)
    await store.markAnswered(prayer.id)
    expect(store.prayerForSource('school:m03:d17')).toBeNull()
  })

  it('survives a reload', async () => {
    await store.addPrayer({ text: 'Persisted' })
    setActivePinia(createPinia())
    const again = usePregnancyStore()
    await again.load()
    expect(again.prayers[0].text).toBe('Persisted')
  })
})
