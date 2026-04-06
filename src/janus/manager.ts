import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import WebSocket from "ws";
import { calculateDelay } from "../lib/retry";
import { resilienceConfig, janusDebugLevel } from "../lib/env-config";
import { healthMonitor } from "../lib/health";
import { HealthState, ErrorSeverity } from "../lib/health-monitor";

const JANUS_WS_PORT = 8188;

export type JanusMode = "external" | "embedded" | "unavailable";

export interface JanusManager {
  /** Start Janus. Resolves true when ready, false if unavailable. */
  start(): Promise<boolean>;
  stop(): void;
  readonly wsUrl: string;
  /** Mode is set once at startup and never changes. */
  readonly mode: JanusMode;
  /** Called by bridge when Janus becomes ready after a crash. */
  onCrash(callback: () => void): void;
}

export function createJanusManager(): JanusManager {
  let proc: ChildProcess | null = null;
  let stopped = false;
  let restartAttempt = 0;
  let crashCallback: (() => void) | null = null;
  let janusBinary: string | null = null;
  let janusMode: JanusMode = "unavailable";
  let externalPollTimer: ReturnType<typeof setTimeout> | null = null;
  const wsUrl = `ws://127.0.0.1:${JANUS_WS_PORT}`;

  function findJanusBinary(): string | null {
    const candidates = ["/usr/bin/janus", "/usr/local/bin/janus", "janus"];
    for (const bin of candidates) {
      try {
        if (bin.startsWith("/") && fs.existsSync(bin)) return bin;
      } catch {
        // ignore
      }
    }
    try {
      const { execSync } =
        require("child_process") as typeof import("child_process");
      const result = execSync("which janus 2>/dev/null", {
        encoding: "utf8",
      }).trim();
      if (result) return result;
    } catch {
      // not found
    }
    return null;
  }

  function writeConfig(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "janus-"));

    const projectConfigDir = path.join(
      __dirname,
      "..",
      "..",
      "config",
      "janus"
    );
    const distConfigDir = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "config",
      "janus"
    );
    const configDir = fs.existsSync(projectConfigDir)
      ? projectConfigDir
      : fs.existsSync(distConfigDir)
        ? distConfigDir
        : null;

    if (configDir) {
      for (const file of fs.readdirSync(configDir)) {
        fs.copyFileSync(path.join(configDir, file), path.join(dir, file));
      }
    }

    return dir;
  }

  function waitForReady(timeoutMs = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;

      function attempt() {
        if (Date.now() > deadline) {
          resolve(false);
          return;
        }
        const ws = new WebSocket(wsUrl, "janus-protocol");
        ws.once("open", () => {
          ws.close();
          resolve(true);
        });
        ws.once("error", () => {
          setTimeout(attempt, 500);
        });
      }
      attempt();
    });
  }

  function probeWs(timeoutMs = 2000): Promise<boolean> {
    return new Promise((resolve) => {
      const ws = new WebSocket(wsUrl, "janus-protocol");
      const timer = setTimeout(() => {
        ws.terminate();
        resolve(false);
      }, timeoutMs);
      ws.once("open", () => {
        clearTimeout(timer);
        ws.close();
        resolve(true);
      });
      ws.once("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  /** Periodic health check for external Janus — fires every 10s. */
  function startExternalWatchdog(): void {
    const INTERVAL_MS = 10_000;
    function tick() {
      if (stopped || janusMode !== "external") return;
      probeWs().then((reachable) => {
        if (stopped) return;
        if (
          !reachable &&
          healthMonitor.getHealth().janus !== HealthState.RECOVERING
        ) {
          console.warn("[janus] External Janus unreachable — recovering");
          healthMonitor.setState("janus", HealthState.RECOVERING);
          healthMonitor.pushError(
            "janus",
            "External Janus unreachable",
            ErrorSeverity.ERROR
          );
          healthMonitor.incrementRestarts("janus");
          scheduleExternalRecoveryPoll();
        } else if (reachable) {
          externalPollTimer = setTimeout(tick, INTERVAL_MS);
        }
      });
    }
    externalPollTimer = setTimeout(tick, INTERVAL_MS);
  }

  /** Poll WS until reachable again — only used in external mode. */
  function scheduleExternalRecoveryPoll(): void {
    if (stopped) return;
    const delay = calculateDelay(restartAttempt, resilienceConfig.retry);
    restartAttempt++;
    externalPollTimer = setTimeout(async () => {
      if (stopped) return;
      const reachable = await probeWs();
      if (reachable) {
        console.log("[janus] External Janus reachable again");
        restartAttempt = 0;
        healthMonitor.setState("janus", HealthState.HEALTHY);
        if (crashCallback) crashCallback();
      } else {
        scheduleExternalRecoveryPoll();
      }
    }, delay);
  }

  function spawnEmbedded(): void {
    if (proc) return;
    const configDir = writeConfig();
    console.log(`[janus] Starting embedded with config dir: ${configDir}`);

    proc = spawn(
      janusBinary!,
      ["--configs-folder", configDir, "--debug-level", String(janusDebugLevel)],
      {
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    proc.stdout!.on("data", (d: Buffer) =>
      process.stdout.write(`[janus] ${d}`)
    );
    proc.stderr!.on("data", (d: Buffer) =>
      process.stderr.write(`[janus] ${d}`)
    );

    proc.on("close", (code) => {
      proc = null;
      if (stopped) return;
      const msg = `Janus process exited (code ${code})`;
      console.log(`[janus] ${msg} — restarting embedded`);
      healthMonitor.setState("janus", HealthState.RECOVERING);
      healthMonitor.pushError("janus", msg, ErrorSeverity.ERROR);
      healthMonitor.incrementRestarts("janus");
      const delay = calculateDelay(restartAttempt, resilienceConfig.retry);
      restartAttempt++;
      setTimeout(async () => {
        if (stopped) return;
        spawnEmbedded();
        const ready = await waitForReady();
        if (ready) {
          restartAttempt = 0;
          healthMonitor.setState("janus", HealthState.HEALTHY);
          if (crashCallback) crashCallback();
        }
      }, delay);
    });

    proc.on("error", (err) => {
      console.error("[janus] Failed to spawn:", err.message);
      proc = null;
    });
  }

  return {
    get wsUrl() {
      return wsUrl;
    },

    get mode(): JanusMode {
      return janusMode;
    },

    onCrash(callback: () => void): void {
      crashCallback = callback;
    },

    async start(): Promise<boolean> {
      stopped = false;

      // 1. Quick probe — is Janus already running?
      const quickProbe = await probeWs(2000);
      if (quickProbe) {
        janusMode = "external";
        console.log("[janus] External Janus detected on", wsUrl);
        healthMonitor.setState("janus", HealthState.HEALTHY);
        startExternalWatchdog();
        return true;
      }

      // 2. Local binary available? → embedded mode
      janusBinary = findJanusBinary();
      if (janusBinary) {
        janusMode = "embedded";
        console.log(`[janus] Embedded mode — binary: ${janusBinary}`);
        spawnEmbedded();
        const ready = await waitForReady(10000);
        if (ready) {
          restartAttempt = 0;
          healthMonitor.setState("janus", HealthState.HEALTHY);
          console.log("[janus] Embedded Janus ready on", wsUrl);
        } else {
          healthMonitor.setState("janus", HealthState.DOWN);
        }
        return ready;
      }

      // 3. No binary — wait longer for a slow-starting sidecar/container
      console.log("[janus] No local binary — waiting for external sidecar…");
      const sidecarReady = await waitForReady(15000);
      if (sidecarReady) {
        janusMode = "external";
        console.log("[janus] External sidecar became ready on", wsUrl);
        healthMonitor.setState("janus", HealthState.HEALTHY);
        startExternalWatchdog();
        return true;
      }

      janusMode = "unavailable";
      console.log("[janus] Unavailable — falling back to MJPEG only");
      return false;
    },

    stop(): void {
      stopped = true;
      if (externalPollTimer) {
        clearTimeout(externalPollTimer);
        externalPollTimer = null;
      }
      if (proc) {
        proc.kill();
        proc = null;
      }
      healthMonitor.setState("janus", HealthState.DOWN);
    },
  };
}
