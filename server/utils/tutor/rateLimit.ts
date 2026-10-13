/** A simple in-memory limit per IP address. One server only: it resets when the server restarts. */

export const TUTOR_LIMIT = 30
export const TUTOR_WINDOW_MS = 10 * 60 * 1000

/** Stop remembering addresses beyond this many, so memory can't grow without end. */
const MAX_TRACKED = 5000

export interface RateLimiter {
  check(key: string): { allowed: boolean; retryAfterSec: number }
  reset(): void
}

export function createRateLimiter(
  options: { limit: number; windowMs: number } = { limit: TUTOR_LIMIT, windowMs: TUTOR_WINDOW_MS },
  now: () => number = Date.now,
): RateLimiter {
  const hits = new Map<string, number[]>()

  function prune(): void {
    const cutoff = now() - options.windowMs
    for (const [key, times] of hits) {
      const recent = times.filter((t) => t > cutoff)
      if (recent.length === 0) hits.delete(key)
      else hits.set(key, recent)
    }
  }

  return {
    check(key) {
      const time = now()
      const cutoff = time - options.windowMs
      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff)
      if (recent.length >= options.limit) {
        hits.set(key, recent)
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((recent[0]! + options.windowMs - time) / 1000)) }
      }
      recent.push(time)
      hits.set(key, recent)
      if (hits.size > MAX_TRACKED) prune()
      return { allowed: true, retryAfterSec: 0 }
    },
    reset() {
      hits.clear()
    },
  }
}

/** Shared by all three tutor routes: 30 requests per 10 minutes per IP address. */
export const tutorLimiter = createRateLimiter()
