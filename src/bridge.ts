import { loadConfig, isConfigured, getBridgeUrl } from "./config/config";
import { createPrusaLinkClient } from "./prusalink/client";
import { createCamera } from "./camera/camera";
import { setCameraInstance } from "./camera/registry";
import { createObicoAgent } from "./obico/agent";
import { HttpFetcher } from "./obico/types";
import { createJanusManager } from "./janus/manager";
import { createJanusRelay } from "./janus/relay";

const httpFetcher: HttpFetcher = { fetch: (url, opts) => fetch(url, opts) };

let running = false;

export async function startBridge(port = 3000): Promise<void> {
  if (!isConfigured()) {
    console.log("[bridge] Not configured — skipping start");
    return;
  }

  if (running) return;
  running = true;

  const config = loadConfig();
  const bridgeUrl = getBridgeUrl(config, port);
  console.log(
    `[bridge] Starting — PrusaLink: ${config.prusalink.url}, Obico: ${config.obico.serverUrl}, Bridge: ${bridgeUrl}`
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

  setCameraInstance(camera);

  const agent = createObicoAgent(
    {
      serverUrl: config.obico.serverUrl,
      apiKey: config.obico.apiKey,
      streamUrl: `${bridgeUrl}/stream`,
    },
    httpFetcher,
    prusaClient
  );

  // Forward camera frames to Obico — throttled to frameIntervalSeconds
  const uploadIntervalMs = config.camera.frameIntervalSeconds * 1000;
  let lastUpload = 0;
  camera.onFrame(async (frame) => {
    const now = Date.now();
    if (now - lastUpload < uploadIntervalMs) return;
    lastUpload = now;
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

  // Janus WebRTC — start if available, fall back to MJPEG-only gracefully
  const RTP_PORT = 17732;
  const janusManager = createJanusManager();
  let janusRelay: ReturnType<typeof createJanusRelay> | null = null;

  async function startJanus(): Promise<void> {
    const available = await janusManager.start();
    if (!available) return;

    camera.startRtpStream(RTP_PORT);

    const printerId = await agent.fetchPrinterId();
    if (!printerId) {
      console.warn(
        "[bridge] Could not fetch printer ID — Janus relay not started"
      );
      return;
    }

    janusRelay = createJanusRelay(
      janusManager.wsUrl,
      config.obico.serverUrl,
      printerId,
      config.obico.apiKey
    );
    janusRelay.start();
    console.log(`[bridge] Janus relay active for printer ${printerId}`);
  }

  // Send status immediately when WS opens, then keep polling
  const intervalMs = config.polling?.statusIntervalMs ?? 5000;
  agent.connect(async () => {
    await agent.updateAgentInfo();
    await startJanus();
    pollAndSend();
  });
  setInterval(pollAndSend, intervalMs);

  console.log("[bridge] Running");
}
