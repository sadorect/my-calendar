/**
 * A small fixed-window limiter, in memory.
 *
 * This service runs as a single process for one family's worth of devices, so
 * an in-memory counter is honest about what it is: enough to blunt credential
 * stuffing, not a distributed rate limiter. If it ever runs behind more than
 * one process, this moves to Postgres or Redis.
 */
export function createRateLimiter({ windowMs = 60_000, max = 10, now = Date.now } = {}) {
  const hits = new Map()

  function sweep(current) {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= current) hits.delete(key)
    }
  }

  return {
    /** @returns {{allowed: boolean, retryAfter: number}} */
    check(key) {
      const current = now()
      // Cheap enough to sweep on write; the map only ever holds active windows.
      if (hits.size > 500) sweep(current)

      const entry = hits.get(key)
      if (!entry || entry.resetAt <= current) {
        hits.set(key, { count: 1, resetAt: current + windowMs })
        return { allowed: true, retryAfter: 0 }
      }
      entry.count++
      if (entry.count > max) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - current) / 1000) }
      }
      return { allowed: true, retryAfter: 0 }
    },
    reset(key) {
      hits.delete(key)
    },
    get size() {
      return hits.size
    }
  }
}
