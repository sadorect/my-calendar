/**
 * Password hashing and bearer tokens, using only node:crypto.
 *
 * No bcrypt, no jsonwebtoken: this service is meant to be dropped onto a small
 * VPS and forgotten about, and every native dependency is a future `npm
 * rebuild` failure on a Node upgrade. scrypt and HMAC are in the standard
 * library and are the right primitives anyway.
 *
 * Note what is being hashed. The browser never sends the user's password — it
 * sends an "auth secret" derived from it, and keeps a separate encryption key
 * it never transmits. This file hashes that secret again with a per-account
 * salt, so a stolen database still does not yield a login.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHmac } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb)

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 }

export async function hashSecret(secret) {
  const salt = randomBytes(16)
  const derived = await scrypt(String(secret), salt, SCRYPT.keylen, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifySecret(secret, stored) {
  const parts = String(stored || '').split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, N, r, p, salt, expected] = parts
  const expectedBuf = Buffer.from(expected, 'base64')
  try {
    const derived = await scrypt(String(secret), Buffer.from(salt, 'base64'), expectedBuf.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p)
    })
    return derived.length === expectedBuf.length && timingSafeEqual(derived, expectedBuf)
  } catch {
    return false
  }
}

/**
 * A signed, expiring bearer token. Self-contained like a JWT but without the
 * algorithm-confusion footguns: one algorithm, no header to negotiate.
 */
export function issueToken(accountId, secret, ttlSeconds = 60 * 60 * 24 * 30) {
  const payload = Buffer.from(
    JSON.stringify({ sub: String(accountId), exp: Math.floor(Date.now() / 1000) + ttlSeconds })
  ).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

/** Returns the account id, or null for anything invalid or expired. */
export function verifyToken(token, secret) {
  const [payload, signature] = String(token || '').split('.')
  if (!payload || !signature) return null

  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!claims.sub) return null
    if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) return null
    return claims.sub
  } catch {
    return null
  }
}

/** Lowercased and trimmed. This is the lookup key and the client's KDF salt. */
export function emailKey(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

export function isPlausibleEmail(email) {
  const key = emailKey(email)
  return key.length >= 3 && key.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)
}
