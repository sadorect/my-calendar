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
    }
  }
}
