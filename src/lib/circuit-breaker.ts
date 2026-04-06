export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerOptions {
  threshold: number;
  resetTimeoutMs: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  totalFailures: number;
  totalSuccesses: number;
  openedAt: number | null;
  timeUntilHalfOpenMs: number | null;
}

export interface CircuitBreaker {
  readonly state: CircuitState;
  readonly stats: CircuitBreakerStats;
  execute<T>(fn: () => Promise<T>): Promise<T>;
}

export function createCircuitBreaker(
  opts: CircuitBreakerOptions
): CircuitBreaker {
  let state = CircuitState.CLOSED;
  let failures = 0;
  let totalFailures = 0;
  let totalSuccesses = 0;
  let openedAt: number | null = null;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  function transitionToOpen(): void {
    state = CircuitState.OPEN;
    openedAt = Date.now();
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      state = CircuitState.HALF_OPEN;
    }, opts.resetTimeoutMs);
  }

  return {
    get state() {
      return state;
    },

    get stats(): CircuitBreakerStats {
      const timeUntilHalfOpenMs =
        state === CircuitState.OPEN && openedAt !== null
          ? Math.max(0, opts.resetTimeoutMs - (Date.now() - openedAt))
          : null;
      return {
        state,
        failureCount: failures,
        totalFailures,
        totalSuccesses,
        openedAt,
        timeUntilHalfOpenMs,
      };
    },

    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (state === CircuitState.OPEN) {
        throw new Error("Circuit breaker is OPEN");
      }

      try {
        const result = await fn();
        totalSuccesses++;
        if (state === CircuitState.HALF_OPEN) {
          state = CircuitState.CLOSED;
          failures = 0;
          openedAt = null;
          if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
          }
        } else {
          failures = 0;
        }
        return result;
      } catch (err) {
        totalFailures++;
        if (state === CircuitState.HALF_OPEN) {
          transitionToOpen();
        } else {
          failures++;
          if (failures >= opts.threshold) {
            transitionToOpen();
          }
        }
        throw err;
      }
    },
  };
}
