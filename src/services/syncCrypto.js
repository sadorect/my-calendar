/**
 * Client-side encryption for sync.
 *
 * The server stores a blob it cannot read. The key is derived in the browser
 * from the account password and never leaves the device, so the database on the
 * server — and any backup of it — holds nothing but random bytes.
 *
 * Two values come out of one password:
 *
 *   master     = PBKDF2(password, salt = email, 310k, SHA-256)  -> 64 bytes
 *   encKey     = master[0..32)   never transmitted
 *   authSecret = master[32..64)  sent to the server, which scrypt-hashes it
 *
 * Splitting them is what makes the scheme worth having: the value the server
 * sees cannot be turned back into the key that decrypts the vault.
 *
 * The email is the salt rather than a random per-account value, so signing in on
 * a new device needs no round trip to fetch a salt — and no endpoint that would
 * confirm which addresses have accounts.
 */

const ITERATIONS = 310_000
const SALT_PREFIX = 'womb-whispers|v1|'

function subtle() {
  const crypto = globalThis.crypto
  if (!crypto?.subtle) throw new Error('This browser cannot encrypt (no Web Crypto)')
  return crypto.subtle
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function toBase64(bytes) {
  let binary = ''
  const view = new Uint8Array(bytes)
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i])
  return btoa(binary)
}

export function fromBase64(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * @returns {{ encKey: CryptoKey, authSecret: string }}
 */
export async function deriveKeys(email, password) {
  const normalisedEmail = String(email || '')
    .trim()
    .toLowerCase()
  if (!normalisedEmail || !password) throw new Error('Email and password are both required')

  const material = await subtle().importKey(
    'raw',
    encoder.encode(String(password)),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await subtle().deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT_PREFIX + normalisedEmail),
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    material,
    512
  )
  const master = new Uint8Array(bits)
  const encKey = await subtle().importKey('raw', master.slice(0, 32), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt'
  ])
  return { encKey, authSecret: toBase64(master.slice(32, 64)) }
}

export async function encryptState(encKey, state) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const plaintext = encoder.encode(JSON.stringify(state))
  const ciphertext = await subtle().encrypt({ name: 'AES-GCM', iv }, encKey, plaintext)
  return { ciphertext: toBase64(ciphertext), iv: toBase64(iv) }
}

export async function decryptState(encKey, { ciphertext, iv }) {
  try {
    const plaintext = await subtle().decrypt(
      { name: 'AES-GCM', iv: fromBase64(iv) },
      encKey,
      fromBase64(ciphertext)
    )
    return JSON.parse(decoder.decode(plaintext))
  } catch {
    // AES-GCM authenticates: a failure here means the wrong key or tampered
    // data, and the two are indistinguishable on purpose.
    throw new Error('Could not decrypt your data — the password does not match this account.')
  }
}
