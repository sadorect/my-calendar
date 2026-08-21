import { describe, it, expect } from 'vitest'
import { bufferToBase64Url, base64UrlToBuffer, shouldRelock } from '../../src/services/biometric.js'

describe('biometric helpers', () => {
  it('round-trips a credential id through base64url', () => {
    const original = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255])
    const encoded = bufferToBase64Url(original.buffer)
    expect(encoded).not.toMatch(/[+/=]/) // url-safe, unpadded
    expect(new Uint8Array(base64UrlToBuffer(encoded))).toEqual(original)
  })

  it('round-trips lengths that need every padding case', () => {
    for (const length of [1, 2, 3, 4, 16, 32, 64]) {
      const bytes = new Uint8Array(length).map((_, i) => (i * 37) % 256)
      expect(new Uint8Array(base64UrlToBuffer(bufferToBase64Url(bytes.buffer)))).toEqual(bytes)
    }
  })

  describe('relock policy', () => {
    it('locks when never unlocked', () => {
      expect(shouldRelock({ unlockedAt: null })).toBe(true)
    })

    it('stays unlocked while the app is in the foreground', () => {
      expect(shouldRelock({ unlockedAt: 1000, hiddenSince: null })).toBe(false)
    })

    it('stays unlocked for a brief switch away', () => {
      const now = 10 * 60 * 1000
      expect(shouldRelock({ unlockedAt: 1, hiddenSince: now - 60 * 1000, now })).toBe(false)
    })

    it('relocks after a long time in the background', () => {
      const now = 10 * 60 * 1000
      expect(shouldRelock({ unlockedAt: 1, hiddenSince: now - 6 * 60 * 1000, now })).toBe(true)
    })

    it('honours a custom grace period', () => {
      const now = 60_000
      expect(shouldRelock({ unlockedAt: 1, hiddenSince: 0, now, graceMs: 30_000 })).toBe(true)
      expect(shouldRelock({ unlockedAt: 1, hiddenSince: 0, now, graceMs: 90_000 })).toBe(false)
    })
  })
})
