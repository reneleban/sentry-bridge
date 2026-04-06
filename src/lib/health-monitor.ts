import { EventEmitter } from "events";

export enum HealthState {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  RECOVERING = "recovering",
  DOWN = "down",
}

export type ComponentName =
  | "prusalink"
  | "camera"
  | "obico_ws"
  | "janus"
  | "rtp_stream"
  | "janus_relay";

const CRITICAL_COMPONENTS: ComponentName[] = [
  "prusalink",
  "camera",
  "obico_ws",
];

type ComponentHealth = Record<ComponentName, HealthState>;

export interface HealthMonitor {
  setState(component: ComponentName, state: HealthState): void;
  getHealth(): Readonly<ComponentHealth>;
  getOverallState(): HealthState;
  isCritical(): boolean;
  on(
    event: "change",
    listener: (e: { component: ComponentName; state: HealthState }) => void
  ): void;
  off(event: "change", listener: (...args: unknown[]) => void): void;
}

export interface HealthMonitorOptions {
  criticalTimeoutMs: number;
}

export function createHealthMonitor(opts: HealthMonitorOptions): HealthMonitor {
  const emitter = new EventEmitter();

  const health: ComponentHealth = {
    prusalink: HealthState.HEALTHY,
    camera: HealthState.HEALTHY,
    obico_ws: HealthState.HEALTHY,
    janus: HealthState.HEALTHY,
    rtp_stream: HealthState.HEALTHY,
    janus_relay: HealthState.HEALTHY,
  };

  // Track when a critical component first went DOWN
  const downSince = new Map<ComponentName, number>();

  return {
    setState(component, state) {
      if (health[component] === state) return;
      health[component] = state;

      if (CRITICAL_COMPONENTS.includes(component)) {
        if (state === HealthState.DOWN) {
          if (!downSince.has(component)) {
            downSince.set(component, Date.now());
          }
        } else {
          downSince.delete(component);
        }
      }

      emitter.emit("change", { component, state });
    },

    getHealth() {
      return { ...health };
    },

    getOverallState() {
      const states = Object.values(health) as HealthState[];
      if (states.includes(HealthState.DOWN)) return HealthState.DOWN;
      if (states.includes(HealthState.RECOVERING))
        return HealthState.RECOVERING;
      if (states.includes(HealthState.DEGRADED)) return HealthState.DEGRADED;
      return HealthState.HEALTHY;
    },

    isCritical() {
      const now = Date.now();
      for (const [, since] of downSince) {
        if (now - since > opts.criticalTimeoutMs) return true;
      }
      return false;
    },

    on(event, listener) {
      emitter.on(event, listener);
    },

    off(event, listener) {
      emitter.off(event, listener as (...args: unknown[]) => void);
    },
  };
}
