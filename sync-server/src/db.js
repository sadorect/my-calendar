import pg from 'pg'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  return new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 8),
    idleTimeoutMillis: 30_000
  })
}

/** Applies schema.sql. Idempotent — every statement is IF NOT EXISTS. */
export async function migrate(pool) {
  const sql = await readFile(join(here, '..', 'schema.sql'), 'utf8')
  await pool.query(sql)
}
