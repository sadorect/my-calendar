import { describe, it, expect, beforeAll } from 'vitest'
import { webcrypto } from 'node:crypto'
import {
  deriveKeys,
  encryptState,
  decryptState,
  toBase64,
  fromBase64
} from '../../src/services/syncCrypto.js'

// happy-dom does not implement Web Crypto's subtle; Node's is the same API.
beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
  }
  if (typeof globalThis.btoa !== 'function') {
    globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64')
    globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary')
  }
})

const state = {
  dueDate: '2026-12-01T00:00:00.000Z',
  babyName: 'Ada',
  journal: { 40: { text: 'Felt you move today.', updatedAt: '2026-08-21T10:00:00.000Z' } },
  updatedAt: '2026-08-21T10:00:00.000Z'
}

describe('base64 helpers', () => {
  it('round-trips bytes', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255])
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes))
  })
})

describe('deriveKeys', () => {
  it('is deterministic for the same email and password', async () => {
    const a = await deriveKeys('someone@example.com', 'correct horse battery')
    const b = await deriveKeys('SOMEONE@Example.com ', 'correct horse battery')
    expect(a.authSecret).toBe(b.authSecret)
  })

  it('gives a different auth secret for a different password', async () => {
    const a = await deriveKeys('someone@example.com', 'password-one')
    const b = await deriveKeys('someone@example.com', 'password-two')
    expect(a.authSecret).not.toBe(b.authSecret)
  })

  it('gives a different auth secret for a different account', async () => {
    const a = await deriveKeys('one@example.com', 'same-password')
    const b = await deriveKeys('two@example.com', 'same-password')
    expect(a.authSecret).not.toBe(b.authSecret)
  })

  it('produces a key the server never sees, separate from the auth secret', async () => {
    const { encKey, authSecret } = await deriveKeys('someone@example.com', 'a-password')
    // Non-extractable: even this process cannot read the key bytes back out,
    // which is the whole point of splitting them.
    expect(encKey.extractable).toBe(false)
    expect(authSecret).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(authSecret.length).toBeGreaterThan(20)
  })

  it('refuses empty credentials', async () => {
    await expect(deriveKeys('', 'password')).rejects.toThrow()
    await expect(deriveKeys('someone@example.com', '')).rejects.toThrow()
  })
})

describe('encrypt and decrypt', () => {
  it('round-trips the state', async () => {
    const { encKey } = await deriveKeys('someone@example.com', 'a-password')
    const payload = await encryptState(encKey, state)
    expect(payload.ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(await decryptState(encKey, payload)).toEqual(state)
  })

  it('leaks nothing recognisable into the ciphertext', async () => {
    const { encKey } = await deriveKeys('someone@example.com', 'a-password')
    const { ciphertext } = await encryptState(encKey, state)
    const decoded = Buffer.from(ciphertext, 'base64').toString('binary')
    expect(decoded).not.toContain('Ada')
    expect(decoded).not.toContain('Felt you move')
  })

  it('uses a fresh nonce every time', async () => {
    const { encKey } = await deriveKeys('someone@example.com', 'a-password')
    const one = await encryptState(encKey, state)
    const two = await encryptState(encKey, state)
    expect(one.iv).not.toBe(two.iv)
    expect(one.ciphertext).not.toBe(two.ciphertext)
  })

  it('refuses the wrong password with a message that says so', async () => {
    const mine = await deriveKeys('someone@example.com', 'a-password')
    const theirs = await deriveKeys('someone@example.com', 'another-password')
    const payload = await encryptState(mine.encKey, state)
    await expect(decryptState(theirs.encKey, payload)).rejects.toThrow(/password does not match/)
  })

  it('detects tampering', async () => {
    const { encKey } = await deriveKeys('someone@example.com', 'a-password')
    const payload = await encryptState(encKey, state)
    const bytes = fromBase64(payload.ciphertext)
    bytes[4] ^= 0xff
    await expect(
      decryptState(encKey, { ...payload, ciphertext: toBase64(bytes) })
    ).rejects.toThrow()
  })
})
