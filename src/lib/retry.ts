export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter?: boolean;
}

export function calculateDelay(
  attempt: number,
  opts: Omit<RetryOptions, "maxAttempts"> & { jitter?: boolean }
): number {
  const base = opts.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(base, opts.maxDelayMs);
  if (!opts.jitter) return capped;
  return Math.floor(Math.random() * capped);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < opts.maxAttempts - 1) {
        const delay = calculateDelay(attempt, opts);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
