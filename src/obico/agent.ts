import WebSocket from "ws";
import {
  ObicoAgent,
  ObicoAgentConfig,
  HttpFetcher,
  PrusaLinkCommandDispatcher,
  buildStatusMessage,
} from "./types";
import { PrinterStatus, JobInfo } from "../prusalink/types";
import { calculateDelay } from "../lib/retry";
import { resilienceConfig } from "../lib/env-config";
import { healthMonitor } from "../lib/health";
import { HealthState, ErrorSeverity } from "../lib/health-monitor";

export function createObicoAgent(
  config: ObicoAgentConfig,
  http: HttpFetcher,
  dispatcher: PrusaLinkCommandDispatcher
): ObicoAgent {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disconnecting = false;

  // Janus signaling — Obico sends {"janus": "<json>"} on the agent WS.
  // We forward to local Janus and send responses back on the same WS.
  let janusWsUrl: string | null = null;
  let janusWs: WebSocket | null = null;
  const janusQueue: string[] = [];

  function ensureJanusWs(): void {
    if (janusWs && janusWs.readyState === WebSocket.OPEN) return;
    if (!janusWsUrl) return;

    janusWs = new WebSocket(janusWsUrl, "janus-protocol");
    janusWs.on("open", () => {
      console.log(
        "[obico/janus] Local Janus WS open — flushing",
        janusQueue.length,
        "queued messages"
      );
      for (const msg of janusQueue) janusWs!.send(msg);
      janusQueue.length = 0;
    });
    janusWs.on("message", (data) => {
      // Forward Janus response back to Obico via agent WS
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ janus: data.toString() }));
      }
    });
    janusWs.on("close", () => {
      console.log("[obico/janus] Local Janus WS closed");
      janusWs = null;
    });
    janusWs.on("error", (err) =>
      console.error("[obico/janus] Local Janus WS error:", err.message)
    );
  }

  function handleJanus(jsonStr: string): void {
    ensureJanusWs();
    if (janusWs?.readyState === WebSocket.OPEN) {
      janusWs.send(jsonStr);
    } else {
      janusQueue.push(jsonStr);
    }
  }

  function wsUrl(serverUrl: string): string {
    return serverUrl.replace(/\/$/, "").replace(/^http/, "ws") + "/ws/dev/";
  }

  function apiUrl(serverUrl: string, path: string): string {
    return serverUrl.replace(/\/$/, "") + path;
  }

  let onOpenCallback: (() => void) | null = null;
  let reconnectAttempt = 0;

  function openWebSocket(url: string): void {
    ws = new WebSocket(url, {
      headers: { authorization: `bearer ${config.apiKey}` },
    });

    ws.on("open", () => {
      console.log("[obico] WebSocket connected to", url);
      reconnectAttempt = 0;
      healthMonitor.setState("obico_ws", HealthState.HEALTHY);
      if (onOpenCallback) onOpenCallback();
    });

    ws.on("message", (data) => {
      console.log("[obico] ← received:", data.toString());
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = JSON.parse(data.toString()) as any;
        if (msg.passthru) handlePassthru(msg.passthru);
        if (msg.janus) handleJanus(msg.janus);
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", (code, reason) => {
      console.log(`[obico] WebSocket closed: ${code} ${reason}`);
      ws = null;
      if (!disconnecting) {
        const msg = `WebSocket closed (code ${code})`;
        healthMonitor.setState("obico_ws", HealthState.RECOVERING);
        healthMonitor.pushError("obico_ws", msg, ErrorSeverity.WARN);
        healthMonitor.incrementRestarts("obico_ws");
        scheduleReconnect(url);
      }
    });

    ws.on("error", (err) => {
      console.error("[obico] WebSocket error:", err.message);
    });
  }

  function scheduleReconnect(url: string): void {
    const delay = calculateDelay(reconnectAttempt, resilienceConfig.retry);
    reconnectAttempt++;
    reconnectTimer = setTimeout(() => openWebSocket(url), delay);
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
    connect(onOpen?: () => void): void {
      disconnecting = false;
      reconnectAttempt = 0;
      onOpenCallback = onOpen ?? null;
      healthMonitor.setState("obico_ws", HealthState.RECOVERING);
      openWebSocket(wsUrl(config.serverUrl));
    },

    disconnect(code: number = 1000): void {
      disconnecting = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        ws.close(code);
        ws = null;
      }
      healthMonitor.setState("obico_ws", HealthState.DOWN);
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

    async waitForPairing(
      serverUrl: string,
      code: string,
      timeoutMs = 120_000
    ): Promise<string> {
      const deadline = Date.now() + timeoutMs;
      const url = `${apiUrl(serverUrl, "/api/v1/octo/verify/")}?code=${code}`;
      for (;;) {
        if (Date.now() >= deadline) {
          throw new Error("Pairing timed out after 120s");
        }
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
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log(
          "[obico] sendStatus skipped — WS not open (state:",
          ws?.readyState,
          ")"
        );
        return;
      }
      const msg = buildStatusMessage(status, job, config.streamUrl);
      const json = JSON.stringify(msg);
      console.log(
        "[obico] sending status:",
        status.state,
        json.substring(0, 200)
      );
      ws.send(json);
    },

    async sendFrame(jpeg: Buffer): Promise<void> {
      const form = new FormData();
      form.append(
        "pic",
        new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }),
        "pic.jpg"
      );
      await http.fetch(apiUrl(config.serverUrl, "/api/v1/octo/pic/"), {
        method: "POST",
        headers: { Authorization: `Token ${config.apiKey}` },
        body: form,
      });
    },

    async fetchPrinterId(): Promise<number | null> {
      try {
        const url = apiUrl(config.serverUrl, "/api/v1/octo/printer/");
        const res = await http.fetch(url, {
          headers: { Authorization: `Token ${config.apiKey}` },
        });
        if (!res.ok) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = (await res.json()) as any;
        return typeof body.printer?.id === "number" ? body.printer.id : null;
      } catch {
        return null;
      }
    },

    setJanusUrl(url: string): void {
      janusWsUrl = url;
    },

    async updateAgentInfo(): Promise<void> {
      try {
        const url = apiUrl(config.serverUrl, "/api/v1/octo/printer/");
        const body = {
          agent_name: "moonraker_obico",
          agent_version: "2.1.0",
        };
        const res = await http.fetch(url, {
          method: "PATCH",
          headers: {
            Authorization: `Token ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          console.log(
            "[obico] Agent info updated (agent_name/agent_version/webcams)"
          );
        } else {
          console.warn("[obico] updateAgentInfo failed:", res.status);
        }
      } catch (err) {
        console.warn("[obico] updateAgentInfo error:", err);
      }
    },
  };
}
