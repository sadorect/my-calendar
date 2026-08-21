import http from 'node:http'
import { createApp } from './app.js'
import { createPool, migrate } from './db.js'
import { postgresStore } from './stores.js'

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '127.0.0.1'

const pool = createPool()
if (process.env.MIGRATE_ON_BOOT !== '0') await migrate(pool)

const app = createApp({
  store: postgresStore(pool),
  tokenSecret: process.env.TOKEN_SECRET,
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  allowRegistration: process.env.ALLOW_REGISTRATION !== '0'
})

const server = http.createServer(app)
server.listen(port, host, () => {
  console.log(`[sync] listening on http://${host}:${port}`)
})

// Finish in-flight requests instead of dropping them on a deploy.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await pool.end()
      process.exit(0)
    })
  })
}
