import { Router } from "express";
import { createPrusaLinkClient } from "../prusalink/client";
import { createCamera } from "../camera/camera";

const router = Router();

// In-memory pairing state (wizard is single-user, single-session)
let pairingState: { serverUrl: string; code: string } | null = null;

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

router.post("/start-pairing", async (req, res) => {
  const { obicoServerUrl } = req.body as { obicoServerUrl?: string };

  if (!obicoServerUrl) {
    res.status(400).json({ message: "obicoServerUrl is required" });
    return;
  }

  try {
    const response = await fetch(
      `${obicoServerUrl.replace(/\/$/, "")}/api/v1/octo/verify/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    if (!response.ok) {
      res
        .status(502)
        .json({ message: `Obico server error: ${response.status}` });
      return;
    }
    const body = (await response.json()) as { code: string };
    pairingState = {
      serverUrl: obicoServerUrl.replace(/\/$/, ""),
      code: body.code,
    };
    res.json({ pairingCode: body.code });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reach Obico server";
    res.status(502).json({ message });
  }
});

router.get("/pairing-status", async (_req, res) => {
  if (!pairingState) {
    res.status(400).json({ message: "No active pairing session" });
    return;
  }

  const { serverUrl, code } = pairingState;

  try {
    const response = await fetch(
      `${serverUrl}/api/v1/octo/verify/?code=${code}`,
      { method: "POST" }
    );

    if (response.status === 410) {
      pairingState = null;
      res.status(410).json({ message: "Pairing code expired" });
      return;
    }

    if (response.ok) {
      const body = (await response.json()) as {
        verified_at?: string;
        printer?: { auth_token: string };
      };
      if (body.verified_at && body.printer?.auth_token) {
        pairingState = null;
        res.json({ paired: true, apiKey: body.printer.auth_token, serverUrl });
        return;
      }
    }

    res.json({ paired: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check failed";
    res.status(502).json({ message });
  }
});

export { router as wizardRouter };
