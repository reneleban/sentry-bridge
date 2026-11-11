import WebSocket from "ws";
import { calculateDelay } from "../lib/retry";
import { resilienceConfig } from "../lib/env-config";
import { healthMonitor } from "../lib/health";
import { HealthState, ErrorSeverity } from "../lib/health-monitor";

export interface JanusRelay {
  start(): void;
  stop(): void;
}

/**
 * Bidirectional WebSocket relay between local Janus and Obico.
 *
 * Janus WS (ws://127.0.0.1:8188, janus-protocol)
 *   ↕
 * Obico   ({serverUrl}/ws/janus/{apiKey}/, token in URL path — JanusWebConsumer)
 *
 * Note: Obico's JanusWebConsumer does NOT parse Authorization headers.
 * Authentication is done via the auth_token in the URL path.
 */
export function createJanusRelay(
  janusWsUrl: string,
  obicoServerUrl: string,
  _printerId: number,
  apiKey: string
): JanusRelay {
  let janusWs: WebSocket | null = null;
  let obicoWs: WebSocket | null = null;
  let stopped = false;
  let reconnectAttempt = 0;
  let reconnectTimer: NodeJS.Timeout | null = null;
  // Bumped on every connect()/stop(); handlers of older sockets become no-ops.
  let generation = 0;

  // Token-based URL path: /ws/token/janus/{token}/ (JanusWebConsumer, no Auth header needed)
  const obicoUrl =
    obicoServerUrl.replace(/\/$/, "").replace(/^http/, "ws") +
    `/ws/token/janus/${apiKey}/`;

  function clearReconnect(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function closeSockets(): void {
    janusWs?.close();
    obicoWs?.close();
    janusWs = null;
    obicoWs = null;
  }

  function scheduleReconnect(): void {
    const msg = "Janus WS connection lost";
    healthMonitor.setState("janus_relay", HealthState.RECOVERING);
    healthMonitor.pushError("janus_relay", msg, ErrorSeverity.WARN);
    healthMonitor.incrementRestarts("janus_relay");
    const delay = calculateDelay(reconnectAttempt, resilienceConfig.retry);
    reconnectAttempt++;
    clearReconnect();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function connect(): void {
    if (stopped) return;
    const gen = ++generation;
    const current = () => gen === generation && !stopped;

    const janus = new WebSocket(janusWsUrl, "janus-protocol");
    janusWs = janus;
    obicoWs = null;

    janus.on("open", () => {
      if (!current()) return;
      console.log("[janus-relay] Janus WS open");
      reconnectAttempt = 0;
      healthMonitor.setState("janus_relay", HealthState.HEALTHY);
      connectObico(gen, janus);
    });

    // Janus → Obico
    janus.on("message", (data) => {
      if (!current()) return;
      if (obicoWs?.readyState === WebSocket.OPEN) obicoWs.send(data);
    });

    janus.on("error", (err) => {
      if (!current()) return;
      console.error("[janus-relay] Janus WS error:", err.message);
    });

    janus.on("close", () => {
      if (!current()) return;
      console.log("[janus-relay] Janus WS closed");
      obicoWs?.close();
      obicoWs = null;
      janusWs = null;
      scheduleReconnect();
    });
  }

  function connectObico(gen: number, janus: WebSocket): void {
    const current = () => gen === generation && !stopped;
    const obico = new WebSocket(obicoUrl, "janus-protocol");
    obicoWs = obico;

    obico.on("open", () => {
      if (current()) console.log("[janus-relay] Obico WS open");
    });

    // Obico → Janus
    obico.on("message", (data) => {
      if (!current()) return;
      if (janus.readyState === WebSocket.OPEN) janus.send(data);
    });

    obico.on("error", (err) => {
      if (current())
        console.error("[janus-relay] Obico WS error:", err.message);
    });

    // Janus close drives the reconnect; closing Janus here triggers it.
    obico.on("close", () => {
      if (!current()) return;
      console.log("[janus-relay] Obico WS closed");
      janus.close();
    });
  }

  return {
    start(): void {
      clearReconnect();
      closeSockets();
      stopped = false;
      reconnectAttempt = 0;
      connect();
    },

    stop(): void {
      stopped = true;
      generation++;
      clearReconnect();
      closeSockets();
      healthMonitor.setState("janus_relay", HealthState.DOWN);
    },
  };
}
