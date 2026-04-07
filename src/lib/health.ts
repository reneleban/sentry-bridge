import { createHealthMonitor } from "./health-monitor";
import { resilienceConfig } from "./env-config";
import type { CircuitBreaker } from "./circuit-breaker";
import type { ComponentName } from "./health-monitor";
import type { JanusMode } from "../janus/manager";

export const healthMonitor = createHealthMonitor({
  criticalTimeoutMs: resilienceConfig.health.criticalTimeoutMs,
});

// Registry for circuit breakers — components register their CB here
// so the health route can expose CB stats without tight coupling
export const circuitBreakerRegistry = new Map<ComponentName, CircuitBreaker>();

// Janus mode — set once by bridge after start(), read by SSE route
export let janusMode: JanusMode = "unavailable"; // set once by bridge after start()
export function setJanusMode(mode: JanusMode): void {
  janusMode = mode;
}
