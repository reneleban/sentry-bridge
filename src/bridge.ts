import { loadConfig, isConfigured } from "./config/config";
import { createPrusaLinkClient } from "./prusalink/client";
import { createCamera } from "./camera/camera";
import { createObicoAgent } from "./obico/agent";
import { HttpFetcher } from "./obico/types";

const httpFetcher: HttpFetcher = { fetch: (url, opts) => fetch(url, opts) };

let running = false;

export async function startBridge(): Promise<void> {
  if (!isConfigured()) {
    console.log("[bridge] Not configured — skipping start");
    return;
  }

  if (running) return;
  running = true;

  const config = loadConfig();
  console.log(
    `[bridge] Starting — PrusaLink: ${config.prusalink.url}, Obico: ${config.obico.serverUrl}`
  );

  const prusaClient = createPrusaLinkClient({
    baseUrl: config.prusalink.url,
    username: config.prusalink.username,
    password: config.prusalink.password,
  });

  const camera = createCamera({
    rtspUrl: config.camera.rtspUrl,
    frameIntervalSeconds: config.camera.frameIntervalSeconds,
  });

  const agent = createObicoAgent(
    { serverUrl: config.obico.serverUrl, apiKey: config.obico.apiKey },
    httpFetcher,
    prusaClient
  );

  // Forward camera frames to Obico
  camera.onFrame(async (frame) => {
    try {
      await agent.sendFrame(frame);
    } catch {
      // non-fatal
    }
  });

  camera.start();

  async function pollAndSend() {
    try {
      const [status, job] = await Promise.all([
        prusaClient.getStatus(),
        prusaClient.getJob(),
      ]);
      agent.sendStatus(status, job);
    } catch {
      // non-fatal — Obico agent handles reconnect
    }
  }

  // Send status immediately when WS opens, then keep polling
  const intervalMs = config.polling?.statusIntervalMs ?? 5000;
  agent.connect(pollAndSend);
  setInterval(pollAndSend, intervalMs);

  console.log("[bridge] Running");
}
