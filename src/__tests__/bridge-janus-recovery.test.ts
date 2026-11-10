import * as http from "http";
import { startBridge, stopBridge, reconnectComponent } from "../bridge";
import { createCamera } from "../camera/camera";
import { createObicoAgent } from "../obico/agent";
import { createJanusManager } from "../janus/manager";
import { createJanusRelay } from "../janus/relay";
import { createPrusaLinkClient } from "../prusalink/client";

jest.mock("../camera/camera");
jest.mock("../camera/registry");
jest.mock("../obico/agent");
jest.mock("../janus/manager");
jest.mock("../janus/relay");
jest.mock("../prusalink/client");
jest.mock("../obico/print-start-store");
jest.mock("../config/config", () => ({
  loadConfig: jest.fn(() => ({
    name: "test",
    prusalink: { url: "http://printer", username: "u", password: "p" },
    camera: { rtspUrl: "rtsp://printer/live", frameIntervalSeconds: 2 },
    obico: { serverUrl: "http://obico", apiKey: "key" },
    polling: { statusIntervalMs: 5000 },
  })),
  isConfigured: jest.fn().mockReturnValue(true),
  getBridgeUrl: jest.fn().mockReturnValue("http://bridge:3000"),
  configEmitter: { removeAllListeners: jest.fn(), on: jest.fn() },
}));

const RTP_PORT = 17732;
const flush = () => new Promise((r) => setImmediate(r));

const camera = {
  start: jest.fn(),
  onFrame: jest.fn(),
  startRtpStream: jest.fn(),
  stopRtpStream: jest.fn(),
  stopGracefully: jest.fn().mockResolvedValue(undefined),
};
const agent = {
  connect: jest.fn((onOpen: () => Promise<void>) => void onOpen()),
  disconnect: jest.fn(),
  updateAgentInfo: jest.fn().mockResolvedValue(undefined),
  setJanusUrl: jest.fn(),
  fetchPrinterId: jest.fn().mockResolvedValue(42),
  sendStatus: jest.fn(),
};
let crashCallbacks: Array<() => void> = [];
const janusManager = {
  start: jest.fn().mockResolvedValue(false),
  stop: jest.fn(),
  wsUrl: "ws://127.0.0.1:8188",
  mode: "bundled",
  onCrash: jest.fn((cb: () => void) => {
    crashCallbacks = [cb];
  }),
};
const relay = { start: jest.fn(), stop: jest.fn() };

(createCamera as jest.Mock).mockReturnValue(camera);
(createObicoAgent as jest.Mock).mockReturnValue(agent);
(createJanusManager as jest.Mock).mockReturnValue(janusManager);
(createJanusRelay as jest.Mock).mockReturnValue(relay);
(createPrusaLinkClient as jest.Mock).mockReturnValue({
  getStatus: jest.fn().mockResolvedValue({}),
  getJob: jest.fn().mockResolvedValue({}),
});

const server = {
  close: jest.fn((cb?: () => void) => cb?.()),
  closeAllConnections: jest.fn(),
} as unknown as http.Server;

describe("bridge — Janus that becomes available after a failed first start", () => {
  beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    await startBridge(3000);
    await flush();
  });

  afterAll(async () => {
    await stopBridge(server);
    jest.restoreAllMocks();
  });

  it("starts no video path while Janus is unavailable", () => {
    expect(janusManager.start).toHaveBeenCalledTimes(1);
    expect(camera.startRtpStream).not.toHaveBeenCalled();
    expect(createJanusRelay).not.toHaveBeenCalled();
  });

  it("starts RTP stream and Janus relay once Janus comes up", async () => {
    expect(crashCallbacks).toHaveLength(1);
    crashCallbacks[0]();
    await flush();

    expect(agent.setJanusUrl).toHaveBeenCalledWith("ws://127.0.0.1:8188");
    expect(camera.startRtpStream).toHaveBeenCalledWith(RTP_PORT);
    expect(createJanusRelay).toHaveBeenCalledWith(
      "ws://127.0.0.1:8188",
      "http://obico",
      42,
      "key"
    );
    expect(relay.start).toHaveBeenCalled();
  });

  it("does not register another recovery handler when Janus is started again on reconnect", async () => {
    await reconnectComponent("obico");
    await flush();

    expect(janusManager.start).toHaveBeenCalledTimes(2);
    expect(janusManager.onCrash).toHaveBeenCalledTimes(1);
  });

  it("stops the RTP stream on shutdown", async () => {
    await stopBridge(server);
    expect(camera.stopRtpStream).toHaveBeenCalled();
  });
});
