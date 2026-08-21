/**
 * Biometric app lock via WebAuthn platform authenticators (Face ID, Touch ID,
 * Android fingerprint, Windows Hello).
 *
 * IMPORTANT — what this is and is not:
 *
 * There is no server, so this is NOT authentication in the cryptographic sense.
 * Nothing verifies the signature, and the data in IndexedDB is not encrypted by
 * it. What this provides is a *device-local lock*: the app will not reveal the
 * journal until the device's own biometric check passes. That is genuinely
 * useful — it stops someone who picks up an unlocked phone from reading a
 * private journal — and it is exactly as strong as the phone's screen lock.
 *
 * It does not protect against someone with devtools access to the browser
 * profile. Do not describe it to users as encryption, because it is not.
 * Real cryptographic protection needs either a server to verify assertions or
 * a key derived from the credential used to encrypt the store — both of which
 * are a separate piece of work.
 */

const RP_NAME = 'Womb Whispers'

export function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlToBuffer(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = window.atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function randomChallenge() {
  return window.crypto.getRandomValues(new Uint8Array(32))
}

/** Whether this device can do a platform (built-in) biometric check at all. */
export async function isBiometricAvailable() {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  // Only platform authenticators count: we want Face ID, not a roaming USB key.
  if (!window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Registers a platform credential and returns its id for storage.
 *
 * @throws when the user cancels or the device refuses. The caller must not
 *         enable the lock unless this resolves, or the user locks themselves
 *         out of their own journal.
 */
export async function enrolBiometric(label = 'This device') {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: RP_NAME },
      user: {
        // No account exists, so the user handle is a local random id. It never
        // leaves the device and identifies nothing about the person.
        id: window.crypto.getRandomValues(new Uint8Array(16)),
        name: label,
        displayName: label,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })

  if (!credential) throw new Error('No credential was created')
  return bufferToBase64Url(credential.rawId)
}

/**
 * Prompts for the biometric check. Resolves true only on a real success.
 *
 * A rejected promise means cancelled or failed, and is treated as "stay locked"
 * rather than as an error to show — a user dismissing Face ID is not a fault.
 */
export async function verifyBiometric(credentialId) {
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: credentialId
          ? [{ type: 'public-key', id: base64UrlToBuffer(credentialId) }]
          : [],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return Boolean(assertion)
  } catch {
    return false
  }
}

/**
 * Asks the browser to keep our storage rather than evicting it under pressure.
 *
 * This is what actually makes an installed PWA remember the user: without it,
 * IndexedDB is "best effort" and a browser clearing space can silently delete
 * the due date, journal and favourites. Installed PWAs are usually granted it.
 */
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function storageIsPersisted() {
  if (!navigator.storage?.persisted) return false
  try {
    return await navigator.storage.persisted()
  } catch {
    return false
  }
}

/**
 * Whether a lock should be re-imposed, given when the app was last unlocked and
 * how long it has been in the background.
 *
 * Pure so it can be tested without a browser: re-locking too eagerly makes the
 * app hostile, and never re-locking makes the lock pointless.
 */
export function shouldRelock({ unlockedAt, hiddenSince, now = Date.now(), graceMs = 5 * 60 * 1000 }) {
  // Null checks, not truthiness: 0 is a legitimate timestamp and treating it as
  // "absent" would silently invert the policy.
  if (unlockedAt == null) return true
  if (hiddenSince == null) return false
  return now - hiddenSince > graceMs
}
