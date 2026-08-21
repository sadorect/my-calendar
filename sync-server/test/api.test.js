import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createApp } from '../src/app.js'
import { memoryStore } from '../src/stores.js'
import { createRateLimiter } from '../src/rateLimit.js'
import { hashSecret, verifySecret, issueToken, verifyToken, isPlausibleEmail } from '../src/auth.js'

const SECRET = 'test-secret-that-is-long-enough-to-pass-32'
const ORIGIN = 'https://calendar.example'

let server
let base
let store

before(async () => {
  store = memoryStore()
  const app = createApp({
    store,
    tokenSecret: SECRET,
    allowedOrigins: [ORIGIN],
    limiter: createRateLimiter({ windowMs: 60_000, max: 1000 })
  })
  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

after(() => new Promise((resolve) => server.close(resolve)))

async function call(path, { method = 'GET', body, token, origin } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(origin ? { Origin: origin } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null }
}

const b64 = (s) => Buffer.from(s).toString('base64')

describe('auth primitives', () => {
  test('scrypt hashes verify and reject', async () => {
    const hash = await hashSecret('secret-value')
    assert.equal(await verifySecret('secret-value', hash), true)
    assert.equal(await verifySecret('other-value', hash), false)
    assert.equal(await verifySecret('secret-value', 'garbage'), false)
  })

  test('tokens round-trip and reject tampering', () => {
    const token = issueToken('42', SECRET)
    assert.equal(verifyToken(token, SECRET), '42')
    assert.equal(verifyToken(token, 'a-different-secret-of-sufficient-len'), null)
    assert.equal(verifyToken(token.slice(0, -2) + 'xx', SECRET), null)
    assert.equal(verifyToken('nonsense', SECRET), null)
  })

  test('expired tokens are refused', () => {
    assert.equal(verifyToken(issueToken('42', SECRET, -10), SECRET), null)
  })

  test('email validation', () => {
    assert.equal(isPlausibleEmail('someone@example.com'), true)
    assert.equal(isPlausibleEmail('  Someone@Example.COM '), true)
    assert.equal(isPlausibleEmail('not-an-email'), false)
    assert.equal(isPlausibleEmail(''), false)
  })
})

describe('registration and login', () => {
  test('registers, then logs in with the same secret', async () => {
    const created = await call('/v1/auth/register', {
      method: 'POST',
      body: { email: 'first@example.com', authSecret: b64('auth-secret-1') }
    })
    assert.equal(created.status, 201)
    assert.ok(created.body.token)

    const login = await call('/v1/auth/login', {
      method: 'POST',
      body: { email: 'FIRST@example.com', authSecret: b64('auth-secret-1') }
    })
    assert.equal(login.status, 200)
    assert.ok(login.body.token)
  })

  test('rejects a wrong secret and an unknown address identically', async () => {
    const wrong = await call('/v1/auth/login', {
      method: 'POST',
      body: { email: 'first@example.com', authSecret: b64('not-it') }
    })
    const missing = await call('/v1/auth/login', {
      method: 'POST',
      body: { email: 'nobody@example.com', authSecret: b64('not-it') }
    })
    assert.equal(wrong.status, 401)
    assert.equal(missing.status, 401)
    assert.deepEqual(wrong.body, missing.body)
  })

  test('does not confirm whether an address is already registered', async () => {
    const again = await call('/v1/auth/register', {
      method: 'POST',
      body: { email: 'first@example.com', authSecret: b64('another') }
    })
    assert.equal(again.status, 409)
    assert.equal(again.body.error, 'unavailable')
    assert.ok(!JSON.stringify(again.body).includes('first@example.com'))
  })

  test('rejects malformed input', async () => {
    const bad = await call('/v1/auth/register', {
      method: 'POST',
      body: { email: 'nope', authSecret: b64('x') }
    })
    assert.equal(bad.status, 400)
  })

  test('rate limits repeated attempts', async () => {
    const app = createApp({
      store: memoryStore(),
      tokenSecret: SECRET,
      limiter: createRateLimiter({ windowMs: 60_000, max: 2 })
    })
    const local = http.createServer(app)
    await new Promise((r) => local.listen(0, '127.0.0.1', r))
    const url = `http://127.0.0.1:${local.address().port}/v1/auth/login`
    const attempt = () =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.com', authSecret: b64('x') })
      })
    await attempt()
    await attempt()
    const third = await attempt()
    assert.equal(third.status, 429)
    assert.ok(third.headers.get('retry-after'))
    await new Promise((r) => local.close(r))
  })
})

describe('vault', () => {
  let token

  before(async () => {
    const res = await call('/v1/auth/register', {
      method: 'POST',
      body: { email: 'vault@example.com', authSecret: b64('vault-secret') }
    })
    token = res.body.token
  })

  test('is empty for a new account', async () => {
    const res = await call('/v1/vault', { token })
    assert.equal(res.status, 200)
    assert.equal(res.body.vault, null)
    assert.equal(res.body.revision, 0)
  })

  test('stores and returns the ciphertext untouched', async () => {
    const put = await call('/v1/vault', {
      method: 'PUT',
      token,
      body: {
        ciphertext: b64('encrypted-bytes'),
        iv: b64('123456789012'),
        clientUpdatedAt: '2026-08-21T10:00:00.000Z',
        baseRevision: 0
      }
    })
    assert.equal(put.status, 200)
    assert.equal(put.body.revision, 1)

    const get = await call('/v1/vault', { token })
    assert.equal(get.body.vault.ciphertext, b64('encrypted-bytes'))
    assert.equal(get.body.vault.clientUpdatedAt, '2026-08-21T10:00:00.000Z')
    assert.equal(get.body.revision, 1)
  })

  test('refuses a write based on a stale revision and hands back the current copy', async () => {
    const stale = await call('/v1/vault', {
      method: 'PUT',
      token,
      body: { ciphertext: b64('second-device'), iv: b64('123456789012'), baseRevision: 0 }
    })
    assert.equal(stale.status, 409)
    assert.equal(stale.body.error, 'conflict')
    assert.equal(stale.body.vault.ciphertext, b64('encrypted-bytes'))

    // Rebasing on what the server actually has succeeds.
    const merged = await call('/v1/vault', {
      method: 'PUT',
      token,
      body: { ciphertext: b64('merged'), iv: b64('123456789012'), baseRevision: 1 }
    })
    assert.equal(merged.status, 200)
    assert.equal(merged.body.revision, 2)
  })

  test('rejects a payload that is not base64', async () => {
    const res = await call('/v1/vault', {
      method: 'PUT',
      token,
      body: { ciphertext: 'not base64!', iv: b64('123456789012'), baseRevision: 2 }
    })
    assert.equal(res.status, 400)
  })

  test('needs a token', async () => {
    assert.equal((await call('/v1/vault')).status, 401)
    assert.equal((await call('/v1/vault', { token: 'forged.token' })).status, 401)
  })

  test('one account cannot see another', async () => {
    const other = await call('/v1/auth/register', {
      method: 'POST',
      body: { email: 'other@example.com', authSecret: b64('other-secret') }
    })
    const res = await call('/v1/vault', { token: other.body.token })
    assert.equal(res.body.vault, null)
  })

  test('deletes on request', async () => {
    assert.equal((await call('/v1/vault', { method: 'DELETE', token })).status, 200)
    assert.equal((await call('/v1/vault', { token })).body.vault, null)
  })
})

describe('CORS and hardening', () => {
  test('echoes only an allowed origin', async () => {
    const good = await call('/health', { origin: ORIGIN })
    assert.equal(good.headers.get('access-control-allow-origin'), ORIGIN)

    const bad = await call('/health', { origin: 'https://evil.example' })
    assert.equal(bad.headers.get('access-control-allow-origin'), null)
  })

  test('answers preflight', async () => {
    const res = await fetch(base + '/v1/vault', { method: 'OPTIONS', headers: { Origin: ORIGIN } })
    assert.equal(res.status, 204)
    assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN)
  })

  test('refuses to start without a real token secret', () => {
    assert.throws(() => createApp({ store: memoryStore(), tokenSecret: 'short' }))
  })

  test('can be locked to existing accounts', async () => {
    const app = createApp({ store: memoryStore(), tokenSecret: SECRET, allowRegistration: false })
    const local = http.createServer(app)
    await new Promise((r) => local.listen(0, '127.0.0.1', r))
    const res = await fetch(`http://127.0.0.1:${local.address().port}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', authSecret: b64('x') })
    })
    assert.equal(res.status, 403)
    await new Promise((r) => local.close(r))
  })

  test('rejects a body that is not JSON', async () => {
    const res = await fetch(base + '/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json'
    })
    assert.equal(res.status, 400)
  })

  test('404s an unknown path', async () => {
    assert.equal((await call('/v1/nope')).status, 404)
  })
})
