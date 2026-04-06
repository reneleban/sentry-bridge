import { loadConfig, isConfigured, getBridgeUrl } from "./config/config";
import { createPrusaLinkClient } from "./prusalink/client";
import { createCamera } from "./camera/camera";
import { setCameraInstance } from "./camera/registry";
import { createObicoAgent } from "./obico/agent";
import { HttpFetcher } from "./obico/types";
import { createJanusManager } from "./janus/manager";
import { createJanusRelay } from "./janus/relay";
import { setJanusMode } from "./lib/health";

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
      // non-fatal — circuit breaker handles flooding, agent handles reconnect
    }
  }

  const RTP_PORT = 17732;
  const janusManager = createJanusManager();
  let janusRelay: ReturnType<typeof createJanusRelay> | null = null;

  async function startJanusRelay(): Promise<void> {
    const printerId = await agent.fetchPrinterId();
    if (!printerId) {
      console.warn(
        "[bridge] Could not fetch printer ID — Janus relay not started"
      );
      return;
    }
    // Stop existing relay before creating a new one
    if (janusRelay) {
      janusRelay.stop();
      janusRelay = null;
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

  async function startJanus(): Promise<void> {
    const available = await janusManager.start();
    setJanusMode(janusManager.mode);
    if (!available) return;

    camera.startRtpStream(RTP_PORT);

    // When Janus crashes and restarts, rebuild RTP stream + relay
    janusManager.onCrash(async () => {
      console.log("[bridge] Janus restarted — rebuilding RTP stream and relay");
      camera.stopRtpStream();
      camera.startRtpStream(RTP_PORT);
      await startJanusRelay();
    });

    // When camera RTSP drops and RTP stream recovers, force Obico to re-negotiate WebRTC
    camera.onRtpRecover(async () => {
      console.log("[bridge] RTP stream recovered — rebuilding Janus relay");
      await startJanusRelay();
    });

    await startJanusRelay();
  }

  // Send status immediately when WS opens, then keep polling.
  // onOpenCallback fires on every reconnect — rebuild Janus relay each time.
  const intervalMs = config.polling?.statusIntervalMs ?? 5000;
  let janusStarted = false;
  agent.connect(async () => {
    await agent.updateAgentInfo();
    if (!janusStarted) {
      janusStarted = true;
      await startJanus();
    } else {
      // Obico WS reconnected — rebuild relay with potentially refreshed printer ID
      if (janusRelay) await startJanusRelay();
    }
    pollAndSend();
  });
  setInterval(pollAndSend, intervalMs);

  console.log("[bridge] Running");
}
