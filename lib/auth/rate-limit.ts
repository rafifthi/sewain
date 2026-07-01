interface Attempt {
  count: number;
  resetAt: number;
}

const store = new Map<string, Attempt>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const attempt = store.get(key);

  if (!attempt || now > attempt.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((attempt.resetAt - now) / 1000) };
  }

  attempt.count++;
  return { allowed: true };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}
