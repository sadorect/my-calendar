import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useAppUpdate,
  bindUpdateHandlers,
  markUpdateReady,
  clearUpdateHandlers
} from '@/composables/useAppUpdate.js'

describe('in-app update control', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearUpdateHandlers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('falls back to a reload where there is no service worker', async () => {
    const { checkForUpdate } = useAppUpdate()
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload })

    await checkForUpdate()
    expect(reload).toHaveBeenCalled()
  })

  it('says so when the check finds nothing new', async () => {
    const check = vi.fn(async () => {})
    bindUpdateHandlers({ check, apply: vi.fn() })
    const { checkForUpdate, note, checking } = useAppUpdate()

    const pending = checkForUpdate()
    expect(checking.value).toBe(true)
    await vi.runAllTimersAsync()
    await pending

    expect(check).toHaveBeenCalled()
    expect(note.value).toBe('You are on the latest version.')
    expect(checking.value).toBe(false)
  })

  it('stays quiet when the check turns up a new version', async () => {
    bindUpdateHandlers({
      check: vi.fn(async () => markUpdateReady(true)),
      apply: vi.fn()
    })
    const { checkForUpdate, note, updateReady } = useAppUpdate()

    const pending = checkForUpdate()
    await vi.runAllTimersAsync()
    await pending

    expect(updateReady.value).toBe(true)
    expect(note.value).toBe('')
  })

  it('applies the waiting version through the worker, not a bare reload', async () => {
    const apply = vi.fn(async () => {})
    bindUpdateHandlers({ check: vi.fn(), apply })
    const { installUpdate } = useAppUpdate()

    await installUpdate()
    expect(apply).toHaveBeenCalled()
  })

  it('reports a failed check instead of hanging on "Checking…"', async () => {
    bindUpdateHandlers({
      check: vi.fn(async () => {
        throw new Error('offline')
      }),
      apply: vi.fn()
    })
    const { checkForUpdate, note, checking } = useAppUpdate()

    const pending = checkForUpdate()
    await vi.runAllTimersAsync()
    await pending

    expect(checking.value).toBe(false)
    expect(note.value).toMatch(/Could not check/)
  })
})
