import { Router, Request, Response } from "express";
import { loadConfig, saveConfig, Config } from "../config/config";
import { createPrusaLinkClient } from "../prusalink/client";
import { createCamera } from "../camera/camera";

const router = Router();

// ── SSE: /api/status/stream ────────────────────────────────────────────────

router.get("/status/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  function send(event: string, data: unknown) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  async function poll() {
    try {
      const config = loadConfig();
      const client = createPrusaLinkClient({
        baseUrl: config.prusalink.url,
        username: config.prusalink.username,
        password: config.prusalink.password,
      });

      const [connectionResult, status, job] = await Promise.allSettled([
        client.testConnection(),
        client.getStatus(),
        client.getJob(),
      ]);

      send("status", {
        prusalink: {
          connected:
            connectionResult.status === "fulfilled" &&
            connectionResult.value.ok,
          error:
            connectionResult.status === "fulfilled"
              ? connectionResult.value.error
              : "Request failed",
        },
        obico: {
          connected: !!(config.obico?.serverUrl && config.obico?.apiKey),
        },
        printer:
          status.status === "fulfilled"
            ? {
                state: status.value.state,
                tempNozzle: status.value.tempNozzle,
                targetNozzle: status.value.targetNozzle,
                tempBed: status.value.tempBed,
                targetBed: status.value.targetBed,
              }
            : null,
        job:
          job.status === "fulfilled" && job.value
            ? {
                fileName: job.value.fileName,
                displayName: job.value.displayName,
                progress: job.value.progress,
                timePrinting: job.value.timePrinting,
                timeRemaining: job.value.timeRemaining,
              }
            : null,
      });
    } catch {
      send("status", {
        prusalink: { connected: false, error: "Config not available" },
        obico: { connected: false },
        printer: null,
        job: null,
      });
    }
  }

  poll();
  const interval = setInterval(poll, 5000);
  req.on("close", () => clearInterval(interval));
});

// ── Camera snapshot: /api/camera/snapshot ─────────────────────────────────

router.get("/camera/snapshot", async (_req: Request, res: Response) => {
  try {
    const config = loadConfig();
    const camera = createCamera({
      rtspUrl: config.camera.rtspUrl,
      frameIntervalSeconds: config.camera.frameIntervalSeconds,
    });
    const frame = await camera.testStream();
    res.setHeader("Content-Type", "image/jpeg");
    res.send(frame);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Snapshot failed";
    res.status(502).json({ message });
  }
});

// ── Printer control: POST /api/control ────────────────────────────────────

router.post("/control", async (req: Request, res: Response) => {
  const { action } = req.body as { action?: string };

  if (!action || !["pause", "resume", "cancel"].includes(action)) {
    res.status(400).json({ message: "action must be pause, resume or cancel" });
    return;
  }

  try {
    const config = loadConfig();
    const client = createPrusaLinkClient({
      baseUrl: config.prusalink.url,
      username: config.prusalink.username,
      password: config.prusalink.password,
    });

    if (action === "pause") await client.pause();
    else if (action === "resume") await client.resume();
    else await client.cancel();

    res.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Control action failed";
    res.status(502).json({ message });
  }
});

// ── Config save: POST /api/setup/save ─────────────────────────────────────

router.post("/setup/save", (req: Request, res: Response) => {
  const body = req.body as Partial<Config>;

  if (
    !body.prusalink?.url ||
    !body.prusalink?.username ||
    !body.prusalink?.password ||
    !body.camera?.rtspUrl ||
    !body.obico?.serverUrl ||
    !body.obico?.apiKey
  ) {
    res.status(400).json({ message: "All config fields are required" });
    return;
  }

  try {
    saveConfig({
      prusalink: body.prusalink,
      camera: {
        rtspUrl: body.camera.rtspUrl,
        frameIntervalSeconds: body.camera.frameIntervalSeconds ?? 10,
      },
      obico: body.obico,
      polling: body.polling ?? { statusIntervalMs: 5000 },
    });
    res.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save config";
    res.status(500).json({ message });
  }
});

export { router as dashboardRouter };
