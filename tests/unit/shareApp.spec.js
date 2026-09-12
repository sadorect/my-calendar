import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useShareApp,
  appUrl,
  androidApkUrl,
  isAndroid,
  ANDROID_APK_PATH
} from '../../src/composables/useShareApp.js'

describe('appUrl', () => {
  it('is the origin root, so a recipient lands on the app itself', () => {
    expect(appUrl()).toBe(`${window.location.origin}/`)
    expect(appUrl().endsWith('/')).toBe(true)
  })
})

describe('the Android app file', () => {
  it('lives on the same origin at a stable path', () => {
    expect(androidApkUrl()).toBe(`${window.location.origin}${ANDROID_APK_PATH}`)
    expect(ANDROID_APK_PATH).toBe('/downloads/birth-calendar.apk')
  })

  it('is offered by user agent', () => {
    const original = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/128 Mobile',
      configurable: true
    })
    expect(isAndroid()).toBe(true)
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true
    })
    expect(isAndroid()).toBe(false)
    Object.defineProperty(navigator, 'userAgent', { value: original, configurable: true })
  })
})

describe('useShareApp', () => {
  let clipboard

  beforeEach(() => {
    clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete navigator.share
  })

  it('uses the native share sheet when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })

    const app = useShareApp()
    await app.share({ title: 'Womb Whispers' })

    expect(share).toHaveBeenCalledTimes(1)
    const payload = share.mock.calls[0][0]
    expect(payload.title).toBe('Womb Whispers')
    expect(payload.url).toBe(appUrl())
    expect(payload.text).toBeTruthy()
    expect(clipboard.writeText).not.toHaveBeenCalled()
  })

  it('falls back to the clipboard and says so', async () => {
    const app = useShareApp()
    await app.share()

    expect(clipboard.writeText).toHaveBeenCalledWith(appUrl())
    expect(app.note.value).toBe('Link copied')

    vi.advanceTimersByTime(2500)
    expect(app.note.value).toBe('')
  })

  it('treats a dismissed share sheet as a non-event', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(abort),
      configurable: true
    })

    const app = useShareApp()
    await app.share()
    expect(app.note.value).toBe('')
  })

  it('reports a real failure instead of failing silently', async () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new Error('nope')),
      configurable: true
    })

    const app = useShareApp()
    await app.share()
    expect(app.note.value).toMatch(/could not share/i)
  })

  it('does not leave the button stuck busy after a failure', async () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new Error('nope')),
      configurable: true
    })

    const app = useShareApp()
    await app.share()
    expect(app.busy.value).toBe(false)
  })

  it('offers no install when the browser never gave a prompt', async () => {
    const app = useShareApp()
    expect(app.canInstall.value).toBeFalsy()
    expect(await app.install()).toBe(false)
  })
})
