import { AddressInfo } from "net";
import { WebSocketServer } from "ws";
import { createJanusRelay } from "../janus/relay";

jest.mock("../lib/retry", () => ({ calculateDelay: () => 20 }));

function listen(): Promise<WebSocketServer> {
  return new Promise((resolve) => {
    const wss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    wss.on("listening", () => resolve(wss));
  });
}

function portOf(wss: WebSocketServer): number {
  return (wss.address() as AddressInfo).port;
}

function closeServer(wss: WebSocketServer): Promise<void> {
  wss.clients.forEach((c) => c.terminate());
  return new Promise((resolve) => wss.close(() => resolve()));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("createJanusRelay() lifecycle", () => {
  let janusWss: WebSocketServer;
  let obicoWss: WebSocketServer;

  beforeEach(async () => {
    janusWss = await listen();
    obicoWss = await listen();
  });

  afterEach(async () => {
    await closeServer(janusWss);
    await closeServer(obicoWss);
  });

  function makeRelay(janusPort = portOf(janusWss)) {
    return createJanusRelay(
      `ws://127.0.0.1:${janusPort}`,
      `http://127.0.0.1:${portOf(obicoWss)}`,
      1,
      "key"
    );
  }

  it("does not open an Obico connection while Janus is unreachable", async () => {
    const deadPort = portOf(janusWss);
    await closeServer(janusWss);
    let obicoConnections = 0;
    obicoWss.on("connection", () => obicoConnections++);

    const relay = makeRelay(deadPort);
    relay.start();
    await wait(150);
    relay.stop();

    expect(obicoConnections).toBe(0);
    janusWss = await listen();
  });

  it("stop() cancels a pending reconnect so stop()+start() yields one connection pair", async () => {
    let janusConnections = 0;
    let obicoConnections = 0;
    const firstJanus = new Promise<void>((resolve) =>
      janusWss.on("connection", (ws) => {
        janusConnections++;
        if (janusConnections === 1) {
          ws.close();
          resolve();
        }
      })
    );
    obicoWss.on("connection", () => obicoConnections++);

    const relay = makeRelay();
    relay.start();
    await firstJanus;
    await wait(5); // close handled, reconnect pending
    relay.stop();
    relay.start();
    await wait(150);
    relay.stop();

    expect(janusConnections).toBe(2);
    expect(obicoConnections).toBeLessThanOrEqual(2);
  });

  it("reconnects after the Janus WS drops", async () => {
    let janusConnections = 0;
    janusWss.on("connection", (ws) => {
      janusConnections++;
      if (janusConnections === 1) ws.close();
    });

    const relay = makeRelay();
    relay.start();
    await wait(200);
    relay.stop();

    expect(janusConnections).toBe(2);
  });
});
