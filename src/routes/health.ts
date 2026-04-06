import { Router } from "express";
import { healthMonitor, circuitBreakerRegistry } from "../lib/health";
import type { ComponentName } from "../lib/health-monitor";

const router = Router();

const COMPONENTS: ComponentName[] = [
  "prusalink",
  "camera",
  "obico_ws",
  "janus",
  "rtp_stream",
  "janus_relay",
];

// Detailed health for dashboard — always 200
router.get("/", (_req, res) => {
  const components: Record<string, unknown> = {};

  for (const name of COMPONENTS) {
    const stats = healthMonitor.getComponentStats(name);
    const entry: Record<string, unknown> = {
      state: stats.state,
      stateSince: stats.stateSince,
      restartCount: stats.restartCount,
      lastErrors: stats.lastErrors,
    };

    const cb = circuitBreakerRegistry.get(name);
    if (cb) {
      entry.circuitBreaker = cb.stats;
    }

    components[name] = entry;
  }

  res.json({
    overall: healthMonitor.getOverallState(),
    components,
  });
});

// Liveness: is the process up? Docker HEALTHCHECK target
router.get("/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Readiness: are critical components healthy enough?
// Returns 503 when isCritical() — signals Docker to restart
router.get("/ready", (_req, res) => {
  if (healthMonitor.isCritical()) {
    res.status(503).json({
      status: "critical",
      components: healthMonitor.getHealth(),
    });
  } else {
    res.status(200).json({
      status: healthMonitor.getOverallState(),
      components: healthMonitor.getHealth(),
    });
  }
});

export default router;
