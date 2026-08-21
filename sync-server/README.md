# Sync server

Self-hosted cross-device sync for the calendar app. Node (one dependency: `pg`)
in front of your own PostgreSQL. No third-party service is involved.

## What it does and does not know

The server stores **one encrypted blob per account** and a hash of an auth
secret. It cannot read what it stores.

The browser derives two values from the account password:

```
master     = PBKDF2(password, salt = "womb-whispers|v1|" + email, 310k, SHA-256)
encKey     = master[0..32)    AES-GCM key. Never leaves the device.
authSecret = master[32..64)   Sent to the server, which scrypt-hashes it again.
```

So a database dump — or a backup, or an administrator — yields ciphertext and a
scrypt hash, neither of which decrypts anything. The cost of that is real and
worth stating plainly: **a forgotten password cannot be reset.** There is no
key escrow, so there is nothing to recover with.

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | liveness |
| `POST` | `/v1/auth/register` | `{ email, authSecret }` → `{ token }` |
| `POST` | `/v1/auth/login` | `{ email, authSecret }` → `{ token }` |
| `GET` | `/v1/vault` | → `{ vault, revision }` |
| `PUT` | `/v1/vault` | `{ ciphertext, iv, clientUpdatedAt, baseRevision }`; `409` returns the current copy |
| `DELETE` | `/v1/vault` | deletes the stored blob |
| `DELETE` | `/v1/account` | deletes the account and its blob |

Writes are compare-and-set on `revision`, so two devices saving at once cannot
overwrite each other: the loser gets a `409` carrying the current copy, merges
locally and retries. Merge rules live in `src/services/mergeState.js` in the app.

## Configuration

| Variable | Required | Meaning |
|----------|----------|---------|
| `DATABASE_URL` | yes | e.g. `postgres://calendar:…@127.0.0.1:5437/calendar_sync` |
| `TOKEN_SECRET` | yes | ≥32 chars, signs bearer tokens. Rotating it signs everyone out. |
| `ALLOWED_ORIGINS` | yes | comma-separated exact origins, e.g. `https://calendar.example` |
| `PORT` | no | default `8787` |
| `HOST` | no | default `127.0.0.1` — bind to loopback and reverse-proxy |
| `ALLOW_REGISTRATION` | no | `0` closes signup once your own accounts exist |
| `TRUST_PROXY` | no | `1` to honour `X-Forwarded-For` for rate limiting |
| `MIGRATE_ON_BOOT` | no | `0` to skip the schema check on start |

## Deploying on the VPS

Postgres, in its own container so it shares nothing with the other apps on the
box. Note the loopback bind — a published Docker port bypasses `ufw`:

```bash
docker run -d --name calendar_postgres --restart unless-stopped \
  -e POSTGRES_DB=calendar_sync \
  -e POSTGRES_USER=calendar \
  -e POSTGRES_PASSWORD='<generate one>' \
  -p 127.0.0.1:5437:5432 \
  -v calendar_pgdata:/var/lib/postgresql/data \
  postgres:16
```

The service:

```bash
cd /opt/calendar-sync && npm ci --omit=dev && npm run migrate
```

`/etc/systemd/system/calendar-sync.service`:

```ini
[Unit]
Description=Calendar sync
After=network.target docker.service

[Service]
Type=simple
User=calendar
WorkingDirectory=/opt/calendar-sync
EnvironmentFile=/etc/calendar-sync.env
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Apache vhost in front of it (TLS terminates here; the service itself only ever
listens on loopback):

```apache
<VirtualHost *:443>
  ServerName sync.example.com
  SSLEngine on
  # …certificate directives…
  ProxyPreserveHost On
  ProxyPass        / http://127.0.0.1:8787/
  ProxyPassReverse / http://127.0.0.1:8787/
</VirtualHost>
```

Then point the app at it by setting `VITE_SYNC_URL=https://sync.example.com`
in the build environment. Unset, the app has no sync and the UI hides it.

## Tests

```bash
npm test
```

22 tests over the HTTP surface, auth primitives and the conflict protocol,
using an in-memory store — no database needed.
