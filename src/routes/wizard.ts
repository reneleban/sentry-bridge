import { Router } from "express";
import { createPrusaLinkClient } from "../prusalink/client";
import { createCamera } from "../camera/camera";
import { isConfigured } from "../config/config";
import { createObicoAgent } from "../obico/agent";
import { HttpFetcher, PrusaLinkCommandDispatcher } from "../obico/types";

const httpFetcher: HttpFetcher = { fetch: (u, o) => fetch(u, o) };
const noopDispatcher: PrusaLinkCommandDispatcher = {
  pause: () => Promise.resolve(),
  resume: () => Promise.resolve(),
  cancel: () => Promise.resolve(),
};

const router = Router();

router.post("/test-prusalink", async (req, res) => {
  const { url, username, password } = req.body as {
    url?: string;
    username?: string;
    password?: string;
  };

  if (!url || !username || !password) {
    res
      .status(400)
      .json({ message: "url, username and password are required" });
    return;
  }

  const client = createPrusaLinkClient({ baseUrl: url, username, password });
  const result = await client.testConnection();

  if (result.ok) {
    res.json({ ok: true });
  } else {
    res.status(502).json({ message: result.error ?? "Connection failed" });
  }
});

router.post("/test-camera", async (req, res) => {
  const { rtspUrl } = req.body as { rtspUrl?: string };

  if (!rtspUrl) {
    res.status(400).json({ message: "rtspUrl is required" });
    return;
  }

  const camera = createCamera({ rtspUrl, frameIntervalSeconds: 10 });
  try {
    const frame = await camera.testStream();
    res.json({ ok: true, frame: frame.toString("base64") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stream not reachable";
    res.status(502).json({ message });
  }
});

router.post("/verify-pairing", async (req, res) => {
  const { obicoServerUrl, code } = req.body as {
    obicoServerUrl?: string;
    code?: string;
  };

  if (!obicoServerUrl || !code) {
    res.status(400).json({ message: "obicoServerUrl and code are required" });
    return;
  }

  const agent = createObicoAgent(
    { serverUrl: obicoServerUrl, apiKey: "" },
    httpFetcher,
    noopDispatcher
  );

  try {
    const apiKey = await agent.waitForPairing(obicoServerUrl, code);
    res.json({ apiKey, serverUrl: obicoServerUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pairing failed";
    if (/timed out/i.test(message)) {
      res.status(504).json({ message });
    } else if (/expired/i.test(message)) {
      res.status(410).json({ message });
    } else {
      res.status(502).json({ message });
    }
  }
});

router.get("/configured", (_req, res) => {
  res.json({ configured: isConfigured() });
});

export { router as wizardRouter };
