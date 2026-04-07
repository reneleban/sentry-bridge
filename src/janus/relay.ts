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

  // Token-based URL path: /ws/token/janus/{token}/ (JanusWebConsumer, no Auth header needed)
  const obicoUrl =
    obicoServerUrl.replace(/\/$/, "").replace(/^http/, "ws") +
    `/ws/token/janus/${apiKey}/`;

  function connect(): void {
    if (stopped) return;

    janusWs = new WebSocket(janusWsUrl, "janus-protocol");
    obicoWs = new WebSocket(obicoUrl, "janus-protocol");

    janusWs.on("open", () => {
      console.log("[janus-relay] Janus WS open");
      reconnectAttempt = 0;
      healthMonitor.setState("janus_relay", HealthState.HEALTHY);
    });
    obicoWs.on("open", () => console.log("[janus-relay] Obico WS open"));

    // Janus → Obico
    janusWs.on("message", (data) => {
      if (obicoWs?.readyState === WebSocket.OPEN) {
        obicoWs.send(data);
      }
    });

    // Obico → Janus
    obicoWs.on("message", (data) => {
      if (janusWs?.readyState === WebSocket.OPEN) {
        janusWs.send(data);
      }
    });

    janusWs.on("error", (err) =>
      console.error("[janus-relay] Janus WS error:", err.message)
    );
    obicoWs.on("error", (err) =>
      console.error("[janus-relay] Obico WS error:", err.message)
    );

    janusWs.on("close", () => {
      console.log("[janus-relay] Janus WS closed");
      obicoWs?.close();
      if (!stopped) {
        const msg = "Janus WS connection lost";
        healthMonitor.setState("janus_relay", HealthState.RECOVERING);
        healthMonitor.pushError("janus_relay", msg, ErrorSeverity.WARN);
        healthMonitor.incrementRestarts("janus_relay");
        const delay = calculateDelay(reconnectAttempt, resilienceConfig.retry);
        reconnectAttempt++;
        setTimeout(connect, delay);
      }
    });

    obicoWs.on("close", () => {
      console.log("[janus-relay] Obico WS closed");
      janusWs?.close();
    });
  }

  return {
    start(): void {
      stopped = false;
      reconnectAttempt = 0;
      connect();
    },

    stop(): void {
      stopped = true;
      janusWs?.close();
      obicoWs?.close();
      janusWs = null;
      obicoWs = null;
      healthMonitor.setState("janus_relay", HealthState.DOWN);
    },
  };
}
