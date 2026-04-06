import { createHealthMonitor } from "./health-monitor";
import { resilienceConfig } from "./env-config";

export const healthMonitor = createHealthMonitor({
  criticalTimeoutMs: resilienceConfig.health.criticalTimeoutMs,
});
