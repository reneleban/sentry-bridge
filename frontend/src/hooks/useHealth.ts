import { useCallback, useEffect, useRef, useState } from "react";

// Types mirror the backend /api/health response shape
export type HealthState = "healthy" | "degraded" | "recovering" | "down";
type CBState = "CLOSED" | "OPEN" | "HALF_OPEN";
type ErrorSeverity = "warn" | "error" | "critical";

export interface ErrorEntry {
  ts: number;
  msg: string;
  severity: ErrorSeverity;
}

export interface CircuitBreakerStats {
  state: CBState;
  failureCount: number;
  totalFailures: number;
  totalSuccesses: number;
  openedAt: number | null;
  timeUntilHalfOpenMs: number | null;
}

export interface ComponentStats {
  state: HealthState;
  stateSince: number;
  restartCount: number;
  lastErrors: ErrorEntry[];
  circuitBreaker?: CircuitBreakerStats;
}

export interface HealthResponse {
  overall: HealthState;
  components: Record<string, ComponentStats>;
}

export type ReconnectTarget = "prusalink" | "obico" | "camera";

export interface UseHealthReturn {
  health: HealthResponse | null;
  lastFetchTime: number | null;
  isStale: boolean;
  secondsSinceLastFetch: number;
  reconnecting: Partial<Record<ReconnectTarget, boolean>>;
  reconnect: (component: ReconnectTarget) => Promise<void>;
}

const FETCH_INTERVAL_MS = 10_000;   // D-09
const STALE_THRESHOLD_MS = 30_000;  // D-14
const TIMESTAMP_TICK_MS = 1_000;    // D-15

export function useHealth(): UseHealthReturn {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [reconnecting, setReconnecting] = useState<
    Partial<Record<ReconnectTarget, boolean>>
  >({});

  const fetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch health, never blank existing state on failure (D-13)
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) return;
      const data = (await res.json()) as HealthResponse;
      setHealth(data);
      setLastFetchTime(Date.now());
    } catch {
      // swallow — keep last known state visible
    }
  }, []);

  const clearFetchInterval = useCallback(() => {
    if (fetchIntervalRef.current !== null) {
      clearInterval(fetchIntervalRef.current);
      fetchIntervalRef.current = null;
    }
  }, []);

  const startFetchInterval = useCallback(() => {
    clearFetchInterval();
    fetchIntervalRef.current = setInterval(fetchHealth, FETCH_INTERVAL_MS);
  }, [fetchHealth, clearFetchInterval]);

  // Effect 1: fetch + 10s polling interval, with Page Visibility pause/resume (D-10)
  useEffect(() => {
    fetchHealth();
    startFetchInterval();

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchHealth();
        startFetchInterval();
      } else {
        clearFetchInterval();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearFetchInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2: 1-second tick for timestamp display (independent of fetch interval — D-15)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TIMESTAMP_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Reconnect: POST, trigger immediate fetch, clear spinner in finally (Pitfall 3)
  const reconnect = useCallback(
    async (component: ReconnectTarget) => {
      setReconnecting((prev) => ({ ...prev, [component]: true }));
      try {
        await fetch("/api/bridge/reconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ component }),
        });
        await fetchHealth(); // D-11: immediate fetch after reconnect
      } finally {
        setReconnecting((prev) => ({ ...prev, [component]: false }));
      }
    },
    [fetchHealth]
  );

  const secondsSinceLastFetch =
    lastFetchTime === null ? 0 : Math.floor((now - lastFetchTime) / 1000);
  const isStale =
    lastFetchTime !== null && now - lastFetchTime >= STALE_THRESHOLD_MS;

  return {
    health,
    lastFetchTime,
    isStale,
    secondsSinceLastFetch,
    reconnecting,
    reconnect,
  };
}
