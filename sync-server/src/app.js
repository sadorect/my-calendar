/**
 * The HTTP surface. Plain node:http — the routing need here is six endpoints,
 * which is less code than configuring a framework would be, and it keeps the
 * dependency list at exactly one (pg).
 */
import {
  hashSecret,
  verifySecret,
  issueToken,
  verifyToken,
  emailKey,
  isPlausibleEmail,
  safeEqual
} from './auth.js'
import { createRateLimiter } from './rateLimit.js'

/** 4MB of base64 is a very large journal; anything past it is a mistake. */
const MAX_BODY_BYTES = 4 * 1024 * 1024

function send(res, status, body, headers = {}) {
  const payload = body === null ? '' : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(Object.assign(new Error('Body must be JSON'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

function isBase64(value, { maxLength = MAX_BODY_BYTES } = {}) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
}

/**
 * @param {object} deps
 * @param {object} deps.store            memoryStore() or postgresStore(pool)
 * @param {string} deps.tokenSecret      HMAC key for bearer tokens
 * @param {string[]} deps.allowedOrigins exact origins allowed to call this API
 * @param {boolean} deps.allowRegistration  false locks the instance to existing accounts
 */
/**
 * Every usage event this service will store. An allowlist rather than free-form
 * names: it is the difference between a counter and an open-ended log of what
 * somebody did, and only one of those belongs next to a pregnancy journal.
 */
export const USAGE_EVENTS = [
  'app_open',
  'birth_open',
  'onboarding_complete',
  'view_today',
  'view_month',
  'view_weeks',
  'view_saved',
  'view_settings',
  'reminders_enabled',
  'keepsake_made',
  'declaration_shared',
  'sync_registered',
  'sync_signed_in',
  'update_installed'
]

export function createApp({
  store,
  tokenSecret,
  allowedOrigins = [],
  allowRegistration = true,
  statsToken = '',
  limiter = createRateLimiter({ windowMs: 60_000, max: 10 }),
  // Usage batches are chatty by nature and carry nothing worth guessing at, so
  // they get their own, looser bucket rather than eating the auth allowance.
  usageLimiter = createRateLimiter({ windowMs: 60_000, max: 60 })
}) {
  if (!tokenSecret || tokenSecret.length < 32) {
    throw new Error('TOKEN_SECRET must be at least 32 characters')
  }

  function corsHeaders(req) {
    const origin = req.headers.origin
    if (!origin) return {}
    // Exact match only. A wildcard here would let any site on the internet make
    // credentialed calls on a signed-in user's behalf.
    if (!allowedOrigins.includes(origin)) return {}
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin'
    }
  }

  function clientKey(req) {
    // Trust the proxy's header only when one is configured in front of us.
    const forwarded = req.headers['x-forwarded-for']
    if (process.env.TRUST_PROXY === '1' && forwarded) {
      return String(forwarded).split(',')[0].trim()
    }
    return req.socket?.remoteAddress || 'unknown'
  }

  function authenticate(req) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    return verifyToken(token, tokenSecret)
  }

  async function handleRegister(req, res, body, cors) {
    if (!allowRegistration) {
      return send(res, 403, { error: 'registration_closed' }, cors)
    }
    if (!isPlausibleEmail(body.email) || !isBase64(body.authSecret, { maxLength: 512 })) {
      return send(res, 400, { error: 'invalid_credentials_format' }, cors)
    }
    const key = emailKey(body.email)
    const account = await store.createAccount({
      email: String(body.email).trim(),
      emailKey: key,
      authHash: await hashSecret(body.authSecret)
    })
    if (!account) {
      // Same shape and status as a wrong password, so this endpoint cannot be
      // used to find out who has an account here.
      return send(res, 409, { error: 'unavailable' }, cors)
    }
    return send(
      res,
      201,
      { token: issueToken(account.id, tokenSecret), email: account.email },
      cors
    )
  }

  async function handleLogin(req, res, body, cors) {
    if (!isPlausibleEmail(body.email) || typeof body.authSecret !== 'string') {
      return send(res, 400, { error: 'invalid_credentials_format' }, cors)
    }
    const account = await store.findAccount(emailKey(body.email))
    // Hash even when the account is missing, so the response time does not
    // reveal which addresses exist.
    const ok = account
      ? await verifySecret(body.authSecret, account.authHash)
      : await verifySecret(body.authSecret, await hashSecret('absent'))
    if (!account || !ok) {
      return send(res, 401, { error: 'invalid_credentials' }, cors)
    }
    await store.touchAccount(account.id)
    return send(
      res,
      200,
      { token: issueToken(account.id, tokenSecret), email: account.email },
      cors
    )
  }

  async function handleGetVault(res, accountId, cors) {
    const vault = await store.getVault(accountId)
    if (!vault) return send(res, 200, { vault: null, revision: 0 }, cors)
    return send(res, 200, { vault, revision: vault.revision }, cors)
  }

  async function handlePutVault(res, accountId, body, cors) {
    if (!isBase64(body.ciphertext) || !isBase64(body.iv, { maxLength: 64 })) {
      return send(res, 400, { error: 'invalid_payload' }, cors)
    }
    if (!Number.isInteger(body.baseRevision) || body.baseRevision < 0) {
      return send(res, 400, { error: 'invalid_base_revision' }, cors)
    }
    const result = await store.putVault(accountId, {
      ciphertext: body.ciphertext,
      iv: body.iv,
      clientUpdatedAt: body.clientUpdatedAt || null,
      baseRevision: body.baseRevision
    })
    if (result.conflict) {
      // 409 carries the current copy, so the client can merge in one round trip
      // instead of fetching again and racing a third write.
      return send(res, 409, { error: 'conflict', vault: result.current }, cors)
    }
    return send(
      res,
      200,
      { revision: result.vault.revision, updatedAt: result.vault.updatedAt },
      cors
    )
  }

  /**
   * Anonymous counters. No authentication on purpose — requiring an account
   * would tie every event to a person, which is the thing being avoided. The
   * defences are instead: an exact-origin CORS allowlist, a rate limit, a
   * bounded batch, a name allowlist and a timestamp window.
   */
  async function handleUsage(res, body, cors) {
    const installId = typeof body.installId === 'string' ? body.installId.trim() : ''
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(installId)) {
      return send(res, 400, { error: 'invalid_install_id' }, cors)
    }
    if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > 50) {
      return send(res, 400, { error: 'invalid_batch' }, cors)
    }

    const window = 7 * 24 * 60 * 60 * 1000
    const now = Date.now()
    const events = []
    for (const event of body.events) {
      if (!USAGE_EVENTS.includes(event?.name)) continue
      const at = Date.parse(event.occurredAt)
      // A clock that is days out is either broken or lying; either way the row
      // would poison the daily counts.
      if (Number.isNaN(at) || Math.abs(now - at) > window) continue
      events.push({ name: event.name, occurredAt: new Date(at).toISOString() })
    }
    if (!events.length) return send(res, 400, { error: 'no_valid_events' }, cors)

    const stored = await store.recordEvents(installId, events)
    return send(res, 202, { stored }, cors)
  }

  return async function handler(req, res) {
    const cors = corsHeaders(req)
    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname.replace(/\/+$/, '') || '/'

    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, cors)
        return res.end()
      }

      if (path === '/health') {
        return send(res, 200, { ok: true }, cors)
      }

      if (path === '/v1/auth/register' || path === '/v1/auth/login') {
        if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' }, cors)
        const { allowed, retryAfter } = limiter.check(`auth:${clientKey(req)}`)
        if (!allowed) {
          return send(
            res,
            429,
            { error: 'too_many_attempts' },
            {
              ...cors,
              'Retry-After': String(retryAfter)
            }
          )
        }
        const body = await readBody(req)
        return path.endsWith('register')
          ? handleRegister(req, res, body, cors)
          : handleLogin(req, res, body, cors)
      }

      if (path === '/v1/vault') {
        const accountId = authenticate(req)
        if (!accountId) return send(res, 401, { error: 'unauthorised' }, cors)

        if (req.method === 'GET') return handleGetVault(res, accountId, cors)
        if (req.method === 'PUT') return handlePutVault(res, accountId, await readBody(req), cors)
        if (req.method === 'DELETE') {
          await store.deleteVault(accountId)
          return send(res, 200, { ok: true }, cors)
        }
        return send(res, 405, { error: 'method_not_allowed' }, cors)
      }

      if (path === '/v1/usage') {
        if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' }, cors)
        const { allowed, retryAfter } = usageLimiter.check(`usage:${clientKey(req)}`)
        if (!allowed) {
          return send(res, 429, { error: 'too_many_events' }, { ...cors, 'Retry-After': String(retryAfter) })
        }
        return handleUsage(res, await readBody(req), cors)
      }

      if (path === '/v1/stats') {
        // Off unless a token is configured, so an instance that never wanted
        // this endpoint does not quietly expose one.
        if (!statsToken) return send(res, 404, { error: 'not_found' }, cors)
        if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' }, cors)
        const header = req.headers.authorization || ''
        const presented = header.startsWith('Bearer ') ? header.slice(7) : ''
        if (!safeEqual(presented, statsToken)) {
          return send(res, 401, { error: 'unauthorised' }, cors)
        }
        return send(res, 200, await store.stats(), cors)
      }

      if (path === '/v1/account' && req.method === 'DELETE') {
        const accountId = authenticate(req)
        if (!accountId) return send(res, 401, { error: 'unauthorised' }, cors)
        await store.deleteAccount(accountId)
        return send(res, 200, { ok: true }, cors)
      }

      return send(res, 404, { error: 'not_found' }, cors)
    } catch (error) {
      const status = error?.status || 500
      if (status === 500) console.error('[sync]', error)
      // Never leak an internal message: it is the one place a stack trace or a
      // database error string could reach a stranger.
      return send(res, status, { error: status === 500 ? 'server_error' : error.message }, cors)
    }
  }
}
