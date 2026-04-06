import { Router } from "express";
import { healthMonitor } from "../lib/health";

const router = Router();

// Detailed health for dashboard — always 200
router.get("/", (_req, res) => {
  res.json({
    components: healthMonitor.getHealth(),
    overall: healthMonitor.getOverallState(),
  });
});

// Liveness: is the process up? Docker HEALTHCHECK target
router.get("/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Readiness: are critical components healthy enough?
// Returns 503 when isCritical() — triggers Docker restart
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
