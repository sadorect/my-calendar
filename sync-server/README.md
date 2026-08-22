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

| Method   | Path                | Notes                                                                               |
| -------- | ------------------- | ----------------------------------------------------------------------------------- |
| `GET`    | `/health`           | liveness                                                                            |
| `POST`   | `/v1/auth/register` | `{ email, authSecret }` → `{ token }`                                               |
| `POST`   | `/v1/auth/login`    | `{ email, authSecret }` → `{ token }`                                               |
| `GET`    | `/v1/vault`         | → `{ vault, revision }`                                                             |
| `PUT`    | `/v1/vault`         | `{ ciphertext, iv, clientUpdatedAt, baseRevision }`; `409` returns the current copy |
| `DELETE` | `/v1/vault`         | deletes the stored blob                                                             |
| `DELETE` | `/v1/account`       | deletes the account and its blob                                                    |
| `POST`   | `/v1/usage`         | `{ installId, events:[{name, occurredAt}] }` → `202`; opt-in anonymous counters     |
| `GET`    | `/v1/stats`         | aggregate counts, `Authorization: Bearer $STATS_TOKEN`                              |

Writes are compare-and-set on `revision`, so two devices saving at once cannot
overwrite each other: the loser gets a `409` carrying the current copy, merges
locally and retries. Merge rules live in `src/services/mergeState.js` in the app.

## Counting without tracking

Two separate things live behind the usage and stats routes, and neither can
identify anybody.

**Registrations come for free.** `accounts.created_at` and `vaults.updated_at`
already exist, so how many accounts there are, how many were made this week and
how many devices synced recently are questions the service can answer without
recording anything new. `/v1/stats` returns those aggregates and nothing else —
no email, no install id, no row belonging to one person.

**Usage counters are opt-in and deliberately thin.** `/v1/usage` takes an opaque
install token the browser generated for itself, an event name from a fixed
allowlist (`USAGE_EVENTS` in `src/app.js`), and when it happened. Free-form
names are dropped, batches are capped, timestamps more than seven days out are
discarded, and no IP address is stored. The app sends nothing unless the user
turns the toggle on, and turning it off deletes the install token — so turning
it back on does not rejoin a device to its own history.

There is no authentication on `/v1/usage` on purpose: requiring an account would
tie every event to a person, which is the thing being avoided. Its defences are
the origin allowlist, a rate limit, and the shape of what it will accept.

## Configuration

| Variable             | Required | Meaning                                                                 |
| -------------------- | -------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`       | yes      | e.g. `postgres://calendar:…@127.0.0.1:5437/calendar_sync`               |
| `TOKEN_SECRET`       | yes      | ≥32 chars, signs bearer tokens. Rotating it signs everyone out.         |
| `ALLOWED_ORIGINS`    | yes      | comma-separated exact origins, e.g. `https://calendar.example`          |
| `PORT`               | no       | default `8787`                                                          |
| `HOST`               | no       | default `127.0.0.1` — bind to loopback and reverse-proxy                |
| `ALLOW_REGISTRATION` | no       | `0` closes signup once your own accounts exist                          |
| `TRUST_PROXY`        | no       | `1` to honour `X-Forwarded-For` for rate limiting                       |
| `MIGRATE_ON_BOOT`    | no       | `0` to skip the schema check on start                                   |
| `STATS_TOKEN`        | no       | bearer token for `GET /v1/stats`; unset and the endpoint does not exist |

## Deploying on the VPS

Deployed 2026-08-22 as **https://birthapp.sadorect.com**, live and in use by the
app. What is actually running, which differs from the systemd sketch this
section used to carry:

- `docker compose` (`docker-compose.yml` beside this file), not systemd. The
  deploy user can run Docker unattended but cannot install a unit file without
  a sudo password, and `restart: unless-stopped` survives a reboot just as well.
- Two containers: `calendar_postgres` (Postgres 16, published on
  **127.0.0.1:5437** only — a bare `5437:5432` would bypass `ufw`) and
  `calendar_sync` (this service, on **127.0.0.1:8787**). Neither is reachable
  from outside the box.
- The working copy lives in `/home/deploy/calendar-sync`, with secrets in
  `.env` beside the compose file (mode 0600, never committed —
  `.env.example` shows the shape).
- TLS and the public hostname come from Virtualmin: `birthapp.sadorect.com` is
  a **sub-server of sadorect.com**, so it inherits the parent's Cloudflare
  Origin CA certificate (`*.sadorect.com`, valid to 2040) and works under
  Cloudflare's Full (strict). The reverse proxy was added with
  `virtualmin create-proxy --domain birthapp.sadorect.com --path / --url http://127.0.0.1:8787/`.
- Cloudflare: proxied (orange) A record → 173.212.209.39.

To redeploy after a code change:

```bash
cd /home/deploy/my-calendar/sync-server
cp -r src package.json package-lock.json Dockerfile docker-compose.yml schema.sql /home/deploy/calendar-sync/
cd /home/deploy/calendar-sync && sudo docker compose up -d --build
curl -s https://birthapp.sadorect.com/health
```

Two things that bit during the first deploy, both worth keeping in mind:

- Files on this box are created 0660, and `COPY` preserves the mode, so the
  image's unprivileged `node` user could not read its own source. The Dockerfile
  uses `COPY --chown=node:node` plus an explicit `chmod -R a+rX`.
- `HOST` defaults to `127.0.0.1`, which inside a container means the container's
  own loopback — nothing reaches it. The image sets `HOST=0.0.0.0`; the _host_
  publishes on loopback, which is where the isolation actually belongs.

Then point the app at it by setting `VITE_SYNC_URL=https://birthapp.sadorect.com`
in the build environment (for the live app, that is a Vercel project environment
variable, and it takes a redeploy). Unset, the app has no sync and the UI hides
it.

**Rate limiting is coarser than it looks.** `mod_remoteip` is not enabled on
this Apache, so with `TRUST_PROXY=1` the client key is the Cloudflare edge IP
rather than the visitor's. Ten auth attempts a minute per edge is fine for a
handful of devices; it would need `mod_remoteip` and Cloudflare's ranges (or
`CF-Connecting-IP`) before it meant anything at a larger scale.

## Tests

```bash
npm test
```

22 tests over the HTTP surface, auth primitives and the conflict protocol,
using an in-memory store — no database needed.
