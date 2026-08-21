/**
 * Talks to the self-hosted sync service.
 *
 * The endpoint is a build-time setting (`VITE_SYNC_URL`). When it is unset the
 * app has no sync at all and the UI hides it entirely — the local-first
 * behaviour is the default, not a degraded mode.
 */
import { deriveKeys, encryptState, decryptState } from './syncCrypto.js'

export const SYNC_URL = (import.meta.env?.VITE_SYNC_URL || '').replace(/\/+$/, '')

export function isSyncConfigured() {
  return Boolean(SYNC_URL)
}

class SyncError extends Error {
  constructor(message, { status = 0, code = '' } = {}) {
    super(message)
    this.name = 'SyncError'
    this.status = status
    this.code = code
  }
}

const MESSAGES = {
  invalid_credentials: 'That email and password do not match an account.',
  invalid_credentials_format: 'Check the email address and try again.',
  unavailable: 'That email address cannot be used. If the account is yours, sign in instead.',
  too_many_attempts: 'Too many attempts. Wait a minute and try again.',
  registration_closed: 'This sync server is not accepting new accounts.',
  unauthorised: 'Your session has expired. Sign in again.',
  conflict: 'Someone else saved first.'
}

async function request(path, { method = 'GET', body, token } = {}) {
  let response
  try {
    response = await fetch(`${SYNC_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new SyncError('Could not reach the sync server. Check your connection.', {
      code: 'offline'
    })
  }

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const code = payload?.error || 'error'
    throw Object.assign(
      new SyncError(MESSAGES[code] || 'Sync failed. Try again.', {
        status: response.status,
        code
      }),
      // A conflict carries the server's copy; the caller needs it to merge.
      { vault: payload?.vault }
    )
  }
  return payload
}

export async function signIn({ email, password, register = false }) {
  const { encKey, authSecret } = await deriveKeys(email, password)
  const path = register ? '/v1/auth/register' : '/v1/auth/login'
  const result = await request(path, { method: 'POST', body: { email, authSecret } })
  return { token: result.token, email: result.email, encKey }
}

export async function fetchVault({ token, encKey }) {
  const result = await request('/v1/vault', { token })
  if (!result.vault) return { state: null, revision: 0 }
  return {
    state: await decryptState(encKey, result.vault),
    revision: result.revision
  }
}

/**
 * Pushes a blob. Throws a SyncError with `code === 'conflict'` and the server's
 * copy attached when `baseRevision` is stale.
 */
export async function pushVault({ token, encKey, state, baseRevision }) {
  const { ciphertext, iv } = await encryptState(encKey, state)
  const result = await request('/v1/vault', {
    method: 'PUT',
    token,
    body: { ciphertext, iv, clientUpdatedAt: state?.updatedAt || null, baseRevision }
  })
  return { revision: result.revision, updatedAt: result.updatedAt }
}

/** Decrypts a vault handed back with a 409, so the caller can merge and retry. */
export async function decryptConflict(encKey, vault) {
  if (!vault) return { state: null, revision: 0 }
  return { state: await decryptState(encKey, vault), revision: vault.revision }
}

export async function deleteVault({ token }) {
  await request('/v1/vault', { method: 'DELETE', token })
}

export async function deleteAccount({ token }) {
  await request('/v1/account', { method: 'DELETE', token })
}

export { SyncError }
