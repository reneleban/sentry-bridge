import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import WebSocket from "ws";
import { calculateDelay } from "../lib/retry";
import { resilienceConfig } from "../lib/env-config";
import { healthMonitor } from "../lib/health";
import { HealthState, ErrorSeverity } from "../lib/health-monitor";

const JANUS_WS_PORT = 8188;

export interface JanusManager {
  /** Start Janus if binary is found. Resolves true when ready, false if unavailable. */
  start(): Promise<boolean>;
  stop(): void;
  readonly wsUrl: string;
  /** Called by bridge when Janus crashes — triggers restart sequence */
  onCrash(callback: () => void): void;
}

export function createJanusManager(): JanusManager {
  let proc: ChildProcess | null = null;
  let stopped = false;
  let restartAttempt = 0;
  let crashCallback: (() => void) | null = null;
  let janusBinary: string | null = null;
  const wsUrl = `ws://127.0.0.1:${JANUS_WS_PORT}`;

  function findJanusBinary(): string | null {
    const candidates = ["/usr/bin/janus", "/usr/local/bin/janus", "janus"];
    for (const bin of candidates) {
      try {
        // Use `which` logic — just try the absolute paths, skip PATH lookup
        if (bin.startsWith("/") && fs.existsSync(bin)) return bin;
      } catch {
        // ignore
      }
    }
    // Try PATH via which
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

  async function spawnJanus(): Promise<boolean> {
    if (proc) return true;
    const configDir = writeConfig();
    console.log(`[janus] Starting with config dir: ${configDir}`);

    proc = spawn(janusBinary!, ["--configs-folder", configDir], {
      stdio: ["ignore", "pipe", "pipe"],
    });

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
      console.log(`[janus] ${msg} — restarting`);
      healthMonitor.setState("janus", HealthState.RECOVERING);
      healthMonitor.pushError("janus", msg, ErrorSeverity.ERROR);
      healthMonitor.incrementRestarts("janus");
      const delay = calculateDelay(restartAttempt, resilienceConfig.retry);
      restartAttempt++;
      setTimeout(async () => {
        const ok = await spawnJanus();
        if (ok) {
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

    const ready = await waitForReady();
    if (!ready) {
      console.error("[janus] Did not become ready in time");
      if (proc) {
        proc.kill();
        proc = null;
      }
    }
    return ready;
  }

  return {
    get wsUrl() {
      return wsUrl;
    },

    onCrash(callback: () => void): void {
      crashCallback = callback;
    },

    async start(): Promise<boolean> {
      stopped = false;

      // 1. Check if Janus is already running (Docker sidecar or native)
      const alreadyRunning = await probeWs();
      if (alreadyRunning) {
        console.log("[janus] Already running on", wsUrl, "(sidecar/external)");
        healthMonitor.setState("janus", HealthState.HEALTHY);
        return true;
      }

      // 2. Try to spawn local binary
      janusBinary = findJanusBinary();
      if (!janusBinary) {
        console.log(
          "[janus] Binary not found — Janus unavailable, falling back to MJPEG only"
        );
        return false;
      }

      const ready = await spawnJanus();
      if (ready) {
        restartAttempt = 0;
        healthMonitor.setState("janus", HealthState.HEALTHY);
        console.log("[janus] Ready on", wsUrl);
      } else {
        healthMonitor.setState("janus", HealthState.DOWN);
      }
      return ready;
    },

    stop(): void {
      stopped = true;
      if (proc) {
        proc.kill();
        proc = null;
      }
      healthMonitor.setState("janus", HealthState.DOWN);
    },
  };
}
