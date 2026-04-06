export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerOptions {
  threshold: number;
  resetTimeoutMs: number;
}

export interface CircuitBreaker {
  readonly state: CircuitState;
  execute<T>(fn: () => Promise<T>): Promise<T>;
}

export function createCircuitBreaker(
  opts: CircuitBreakerOptions
): CircuitBreaker {
  let state = CircuitState.CLOSED;
  let failures = 0;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  function transitionToOpen(): void {
    state = CircuitState.OPEN;
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      state = CircuitState.HALF_OPEN;
    }, opts.resetTimeoutMs);
  }

  return {
    get state() {
      return state;
    },

    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (state === CircuitState.OPEN) {
        throw new Error("Circuit breaker is OPEN");
      }

      try {
        const result = await fn();
        // success
        if (state === CircuitState.HALF_OPEN) {
          state = CircuitState.CLOSED;
          failures = 0;
          if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
          }
        } else {
          failures = 0;
        }
        return result;
      } catch (err) {
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
