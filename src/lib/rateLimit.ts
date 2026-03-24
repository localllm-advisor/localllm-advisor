/**
 * Client-side rate limiter using in-memory tracking.
 * Each key (e.g. form name) gets its own bucket.
 */

interface RateBucket {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
}

const buckets = new Map<string, RateBucket>();

/**
 * Check if an action is rate-limited.
 * @param key   – unique identifier (e.g. 'email-capture', 'enterprise-form')
 * @param opts  – maxAttempts per windowMs, plus cooldownMs after limit is hit
 * @returns { allowed, retryAfterMs } – whether the action is allowed, and how long to wait if not
 */
export function checkRateLimit(
  key: string,
  opts: { maxAttempts?: number; windowMs?: number; cooldownMs?: number } = {}
): { allowed: boolean; retryAfterMs: number } {
  const { maxAttempts = 3, windowMs = 60_000, cooldownMs = 10_000 } = opts;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    // First attempt — always allow
    buckets.set(key, { attempts: 1, firstAttempt: now, lastAttempt: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  // Reset window if expired
  if (now - bucket.firstAttempt > windowMs) {
    buckets.set(key, { attempts: 1, firstAttempt: now, lastAttempt: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  // Within window — check attempt count
  if (bucket.attempts >= maxAttempts) {
    const elapsed = now - bucket.lastAttempt;
    if (elapsed < cooldownMs) {
      return { allowed: false, retryAfterMs: cooldownMs - elapsed };
    }
    // Cooldown passed — reset
    buckets.set(key, { attempts: 1, firstAttempt: now, lastAttempt: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  // Still under limit — allow and increment
  bucket.attempts++;
  bucket.lastAttempt = now;
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Simple per-action cooldown (e.g. one submit every N seconds).
 * Lighter than the full rate limiter — good for single-button debounce.
 */
const lastAction = new Map<string, number>();

export function cooldownCheck(key: string, minIntervalMs = 5000): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const last = lastAction.get(key) || 0;
  const elapsed = now - last;

  if (elapsed < minIntervalMs) {
    return { allowed: false, retryAfterMs: minIntervalMs - elapsed };
  }

  lastAction.set(key, now);
  return { allowed: true, retryAfterMs: 0 };
}
