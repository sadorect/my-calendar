import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const store = new Map()
vi.mock('@/services/database', () => ({
  getSetting: vi.fn(async (key) => store.get(key) ?? null),
  setSetting: vi.fn(async (key, value) => {
    if (value === null) store.delete(key)
    else store.set(key, value)
  })
}))

// A configured sync endpoint: without one there is nowhere to send anything and
// the whole module stays inert.
vi.mock('@/services/syncClient', () => ({
  SYNC_URL: 'https://sync.example',
  isSyncConfigured: () => true
}))

import { track, flush, setAnalyticsEnabled, analyticsAvailable } from '@/services/analytics.js'

describe('opt-in usage counters', () => {
  let sent

  beforeEach(async () => {
    store.clear()
    sent = []
    vi.useFakeTimers()
    globalThis.fetch = vi.fn(async (url, init) => {
      sent.push({ url, body: JSON.parse(init.body) })
      return { ok: true }
    })
    await setAnalyticsEnabled(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends nothing at all until it is turned on', async () => {
    track('app_open')
    track('view_today')
    await vi.runAllTimersAsync()
    await flush()

    expect(sent).toEqual([])
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('sends counted event names once enabled', async () => {
    await setAnalyticsEnabled(true)
    track('app_open')
    track('view_weeks')
    await flush()

    expect(sent).toHaveLength(1)
    expect(sent[0].url).toBe('https://sync.example/v1/usage')
    expect(sent[0].body.events.map((e) => e.name)).toEqual(['app_open', 'view_weeks'])
  })

  it('carries no content — only a name and a time', async () => {
    await setAnalyticsEnabled(true)
    track('onboarding_complete')
    await flush()

    const payload = sent[0].body
    expect(Object.keys(payload).sort()).toEqual(['events', 'installId'])
    for (const event of payload.events) {
      expect(Object.keys(event).sort()).toEqual(['name', 'occurredAt'])
    }
  })

  it('refuses names that are not on the allowlist', async () => {
    await setAnalyticsEnabled(true)
    track('journal_text')
    track('babyName')
    await flush()

    expect(sent).toEqual([])
  })

  it('identifies the device by a random token, not anything personal', async () => {
    await setAnalyticsEnabled(true)
    track('app_open')
    await flush()

    expect(sent[0].body.installId).toMatch(/^[0-9a-f]{32}$/)
  })

  it('forgets the device when it is turned off again', async () => {
    await setAnalyticsEnabled(true)
    track('app_open')
    await flush()
    const first = sent[0].body.installId

    await setAnalyticsEnabled(false)
    expect(store.get('usageInstallId')).toBeUndefined()

    // Turning it back on must not rejoin this device to its own history.
    await setAnalyticsEnabled(true)
    track('app_open')
    await flush()
    expect(sent[1].body.installId).not.toBe(first)
  })

  it('drops queued events rather than holding them after opting out', async () => {
    await setAnalyticsEnabled(true)
    track('app_open')
    await setAnalyticsEnabled(false)
    await setAnalyticsEnabled(true)
    await flush()

    expect(sent).toEqual([])
  })

  it('survives the endpoint being down', async () => {
    await setAnalyticsEnabled(true)
    globalThis.fetch = vi.fn(async () => {
      throw new Error('offline')
    })
    track('app_open')
    await expect(flush()).resolves.toBeUndefined()
  })

  it('is only offered where there is somewhere to send to', () => {
    // The endpoint is the sync server; an install with no VITE_SYNC_URL has no
    // analytics at all, and the settings toggle is not rendered.
    expect(analyticsAvailable()).toBe(true)
  })
})
