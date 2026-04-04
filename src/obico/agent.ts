import WebSocket from "ws";
import {
  ObicoAgent,
  ObicoAgentConfig,
  HttpFetcher,
  PrusaLinkCommandDispatcher,
  buildStatusMessage,
} from "./types";
import { PrinterStatus, JobInfo } from "../prusalink/types";

export function createObicoAgent(
  config: ObicoAgentConfig,
  http: HttpFetcher,
  dispatcher: PrusaLinkCommandDispatcher
): ObicoAgent {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disconnecting = false;

  function wsUrl(serverUrl: string): string {
    return serverUrl.replace(/^http/, "ws") + "/ws/dev/";
  }

  function apiUrl(serverUrl: string, path: string): string {
    return serverUrl.replace(/\/$/, "") + path;
  }

  function openWebSocket(url: string): void {
    ws = new WebSocket(url, {
      headers: { authorization: `bearer ${config.apiKey}` },
    });

    ws.on("message", (data) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = JSON.parse(data.toString()) as any;
        if (msg.passthru) handlePassthru(msg.passthru);
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      ws = null;
      if (!disconnecting) scheduleReconnect(url);
    });

    ws.on("error", () => {
      // error is followed by close — reconnect handled there
    });
  }

  let reconnectDelay = 1000;

  function scheduleReconnect(url: string): void {
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      openWebSocket(url);
    }, reconnectDelay);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handlePassthru(passthru: any): void {
    if (passthru.target !== "Printer") return;
    switch (passthru.func) {
      case "pause":
        dispatcher.pause().catch(() => undefined);
        break;
      case "resume":
        dispatcher.resume().catch(() => undefined);
        break;
      case "cancel":
        dispatcher.cancel().catch(() => undefined);
        break;
    }
  }

  return {
    connect(): void {
      disconnecting = false;
      reconnectDelay = 1000;
      openWebSocket(wsUrl(config.serverUrl));
    },

    disconnect(): void {
      disconnecting = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
    },

    async startPairing(serverUrl: string): Promise<string> {
      const res = await http.fetch(apiUrl(serverUrl, "/api/v1/octo/verify/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`startPairing failed: ${res.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (await res.json()) as any;
      return body.code as string;
    },

    async waitForPairing(serverUrl: string, code: string): Promise<string> {
      const url = `${apiUrl(serverUrl, "/api/v1/octo/verify/")}?code=${code}`;
      for (;;) {
        const res = await http.fetch(url, { method: "POST" });
        if (res.status === 410) throw new Error("Pairing code expired");
        if (res.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const body = (await res.json()) as any;
          if (body.verified_at) return body.printer.auth_token as string;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    },

    sendStatus(status: PrinterStatus, job: JobInfo | null): void {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const msg = buildStatusMessage(status, job);
      ws.send(JSON.stringify(msg));
    },

    async sendFrame(jpeg: Buffer): Promise<void> {
      const form = new FormData();
      form.append("img", jpeg.toString("base64"));
      form.append("name", "camera");
      form.append("cam_name", "Buddy3D");
      form.append("is_primary_cam", "true");
      await http.fetch(apiUrl(config.serverUrl, "/api/v1/octo/pic/"), {
        method: "POST",
        headers: { authorization: `bearer ${config.apiKey}` },
        body: form,
      });
    },
  };
}
