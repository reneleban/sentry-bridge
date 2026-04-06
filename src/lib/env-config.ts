function int(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const resilienceConfig = {
  circuitBreaker: {
    threshold: int("CIRCUIT_BREAKER_THRESHOLD", 5),
    resetTimeoutMs: int("CIRCUIT_BREAKER_RESET_TIMEOUT_MS", 60000),
  },
  retry: {
    baseDelayMs: int("RETRY_BASE_DELAY_MS", 1000),
    maxDelayMs: int("RETRY_MAX_DELAY_MS", 30000),
  },
  health: {
    criticalTimeoutMs: int("HEALTHCHECK_CRITICAL_TIMEOUT_MS", 120000),
  },
};
