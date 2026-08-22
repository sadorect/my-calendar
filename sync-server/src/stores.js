/**
 * Storage behind the API.
 *
 * Two implementations against one interface: Postgres for production, and an
 * in-memory one so the whole HTTP surface can be tested without a database.
 * The interface is deliberately narrow — this service stores one encrypted blob
 * per account and nothing else.
 */

export function memoryStore() {
  const accounts = new Map() // emailKey -> account
  const byId = new Map()
  const vaults = new Map() // accountId -> vault
  const usage = [] // { installId, name, occurredAt }
  let nextId = 1

  return {
    async findAccount(emailKey) {
      return accounts.get(emailKey) || null
    },
    async createAccount({ email, emailKey, authHash }) {
      if (accounts.has(emailKey)) return null
      const account = {
        id: String(nextId++),
        email,
        emailKey,
        authHash,
        createdAt: new Date().toISOString()
      }
      accounts.set(emailKey, account)
      byId.set(account.id, account)
      return account
    },
    async touchAccount(id) {
      const account = byId.get(String(id))
      if (account) account.lastSeenAt = new Date().toISOString()
    },
    async getVault(accountId) {
      return vaults.get(String(accountId)) || null
    },
    async putVault(accountId, { ciphertext, iv, clientUpdatedAt, baseRevision }) {
      const key = String(accountId)
      const existing = vaults.get(key)
      const currentRevision = existing?.revision || 0
      if (baseRevision !== currentRevision) {
        return { conflict: true, current: existing || null }
      }
      const vault = {
        ciphertext,
        iv,
        clientUpdatedAt: clientUpdatedAt || null,
        revision: currentRevision + 1,
        bytes: ciphertext.length,
        updatedAt: new Date().toISOString()
      }
      vaults.set(key, vault)
      return { conflict: false, vault }
    },
    async deleteVault(accountId) {
      vaults.delete(String(accountId))
    },
    async deleteAccount(accountId) {
      const account = byId.get(String(accountId))
      if (!account) return
      byId.delete(account.id)
      accounts.delete(account.emailKey)
      vaults.delete(account.id)
    },
    async recordEvents(installId, events) {
      for (const event of events) {
        usage.push({ installId, name: event.name, occurredAt: event.occurredAt })
      }
      return events.length
    },
    async stats({ now = new Date() } = {}) {
      const since = (days) => new Date(now.getTime() - days * 86400000)
      const countAccounts = (days) =>
        [...byId.values()].filter((a) => new Date(a.createdAt) >= since(days)).length
      const activeVaults = (days) =>
        [...vaults.values()].filter((v) => new Date(v.updatedAt) >= since(days)).length
      const recent = usage.filter((e) => new Date(e.occurredAt) >= since(30))
      const byName = {}
      for (const event of recent) byName[event.name] = (byName[event.name] || 0) + 1
      return {
        accounts: { total: byId.size, new7d: countAccounts(7), new30d: countAccounts(30) },
        vaults: {
          total: vaults.size,
          synced7d: activeVaults(7),
          synced30d: activeVaults(30),
          bytes: [...vaults.values()].reduce((sum, v) => sum + (v.bytes || 0), 0)
        },
        usage: {
          installs7d: new Set(
            usage.filter((e) => new Date(e.occurredAt) >= since(7)).map((e) => e.installId)
          ).size,
          installs30d: new Set(recent.map((e) => e.installId)).size,
          events30d: byName
        }
      }
    }
  }
}

function rowToVault(row) {
  if (!row) return null
  return {
    ciphertext: row.ciphertext,
    iv: row.iv,
    clientUpdatedAt: row.client_updated_at ? new Date(row.client_updated_at).toISOString() : null,
    revision: Number(row.revision),
    bytes: Number(row.bytes),
    updatedAt: new Date(row.updated_at).toISOString()
  }
}

export function postgresStore(pool) {
  return {
    async findAccount(emailKey) {
      const { rows } = await pool.query(
        'SELECT id, email, email_key, auth_hash FROM accounts WHERE email_key = $1',
        [emailKey]
      )
      if (!rows.length) return null
      return {
        id: String(rows[0].id),
        email: rows[0].email,
        emailKey: rows[0].email_key,
        authHash: rows[0].auth_hash
      }
    },

    async createAccount({ email, emailKey, authHash }) {
      const { rows } = await pool.query(
        `INSERT INTO accounts (email, email_key, auth_hash) VALUES ($1, $2, $3)
         ON CONFLICT (email_key) DO NOTHING
         RETURNING id, email, email_key, auth_hash`,
        [email, emailKey, authHash]
      )
      // Nothing returned means the address was taken — the caller turns that
      // into the same generic response as a bad password.
      if (!rows.length) return null
      return {
        id: String(rows[0].id),
        email: rows[0].email,
        emailKey: rows[0].email_key,
        authHash: rows[0].auth_hash
      }
    },

    async touchAccount(id) {
      await pool.query('UPDATE accounts SET last_seen_at = now() WHERE id = $1', [id])
    },

    async getVault(accountId) {
      const { rows } = await pool.query('SELECT * FROM vaults WHERE account_id = $1', [accountId])
      return rowToVault(rows[0])
    },

    /**
     * Compare-and-set on `revision`. The WHERE clause is what makes two devices
     * saving at the same moment safe: the second one matches no row and is told
     * to merge instead of overwriting.
     */
    async putVault(accountId, { ciphertext, iv, clientUpdatedAt, baseRevision }) {
      if (baseRevision === 0) {
        const { rows } = await pool.query(
          `INSERT INTO vaults (account_id, ciphertext, iv, client_updated_at, revision, bytes, updated_at)
           VALUES ($1, $2, $3, $4, 1, $5, now())
           ON CONFLICT (account_id) DO NOTHING
           RETURNING *`,
          [accountId, ciphertext, iv, clientUpdatedAt, ciphertext.length]
        )
        if (rows.length) return { conflict: false, vault: rowToVault(rows[0]) }
        return { conflict: true, current: await this.getVault(accountId) }
      }

      const { rows } = await pool.query(
        `UPDATE vaults
            SET ciphertext = $2, iv = $3, client_updated_at = $4,
                revision = revision + 1, bytes = $5, updated_at = now()
          WHERE account_id = $1 AND revision = $6
          RETURNING *`,
        [accountId, ciphertext, iv, clientUpdatedAt, ciphertext.length, baseRevision]
      )
      if (rows.length) return { conflict: false, vault: rowToVault(rows[0]) }
      return { conflict: true, current: await this.getVault(accountId) }
    },

    async deleteVault(accountId) {
      await pool.query('DELETE FROM vaults WHERE account_id = $1', [accountId])
    },

    async deleteAccount(accountId) {
      await pool.query('DELETE FROM accounts WHERE id = $1', [accountId])
    },

    /** One multi-row insert per batch; the client sends at most a handful. */
    async recordEvents(installId, events) {
      if (!events.length) return 0
      const values = []
      const params = [installId]
      for (const event of events) {
        params.push(event.name, event.occurredAt)
        values.push(`($1, $${params.length - 1}, $${params.length})`)
      }
      await pool.query(
        `INSERT INTO usage_events (install_id, name, occurred_at) VALUES ${values.join(', ')}`,
        params
      )
      return events.length
    },

    /**
     * Aggregate only. Registrations come from the accounts table the service
     * already keeps, so counting them costs no tracking of any kind — and no
     * query here returns an email, an install id or a row that belongs to one
     * identifiable person.
     */
    async stats() {
      const [accounts, vaults, installs, events] = await Promise.all([
        pool.query(`SELECT count(*)::int AS total,
                           count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new7d,
                           count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS new30d
                      FROM accounts`),
        pool.query(`SELECT count(*)::int AS total,
                           count(*) FILTER (WHERE updated_at >= now() - interval '7 days')::int AS synced7d,
                           count(*) FILTER (WHERE updated_at >= now() - interval '30 days')::int AS synced30d,
                           coalesce(sum(bytes), 0)::bigint AS bytes
                      FROM vaults`),
        pool.query(`SELECT count(DISTINCT install_id) FILTER (WHERE occurred_at >= now() - interval '7 days')::int AS installs7d,
                           count(DISTINCT install_id) FILTER (WHERE occurred_at >= now() - interval '30 days')::int AS installs30d
                      FROM usage_events`),
        pool.query(`SELECT name, count(*)::int AS count
                      FROM usage_events
                     WHERE occurred_at >= now() - interval '30 days'
                  GROUP BY name
                  ORDER BY count DESC`)
      ])
      return {
        accounts: accounts.rows[0],
        vaults: { ...vaults.rows[0], bytes: Number(vaults.rows[0].bytes) },
        usage: {
          installs7d: installs.rows[0].installs7d,
          installs30d: installs.rows[0].installs30d,
          events30d: Object.fromEntries(events.rows.map((r) => [r.name, r.count]))
        }
      }
    }
  }
}
