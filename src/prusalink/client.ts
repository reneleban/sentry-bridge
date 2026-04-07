import DigestFetch from "digest-fetch";
import {
  FileEntry,
  JobInfo,
  PrinterStatus,
  PrusaLinkClient,
  PrusaLinkConfig,
} from "./types";
import { createCircuitBreaker } from "../lib/circuit-breaker";
import { resilienceConfig } from "../lib/env-config";
import { healthMonitor, circuitBreakerRegistry } from "../lib/health";
import { HealthState, ErrorSeverity } from "../lib/health-monitor";
import { withRetry } from "../lib/retry";

export interface HttpFetcher {
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

function createDigestFetcher(username: string, password: string): HttpFetcher {
  const client = new DigestFetch(username, password);
  return { fetch: (url, opts) => client.fetch(url, opts ?? {}) };
}

export function createPrusaLinkClient(
  config: PrusaLinkConfig,
  fetcher?: HttpFetcher
): PrusaLinkClient {
  const http = fetcher ?? createDigestFetcher(config.username, config.password);
  const base = config.baseUrl.replace(/\/$/, "");
  const cb = createCircuitBreaker(resilienceConfig.circuitBreaker);
  circuitBreakerRegistry.set("prusalink", cb);

  async function request(method: string, path: string, opts?: RequestInit): Promise<Response> {
    try {
      const res = await cb.execute(() =>
        http.fetch(`${base}${path}`, { method, ...opts })
      );
      healthMonitor.setState("prusalink", HealthState.HEALTHY);
      return res;
    } catch (err) {
      const msg = (err as Error).message;
      healthMonitor.setState("prusalink", HealthState.DOWN);
      healthMonitor.pushError(
        "prusalink",
        msg,
        msg === "Circuit breaker is OPEN"
          ? ErrorSeverity.WARN
          : ErrorSeverity.ERROR
      );
      throw err;
    }
  }

  function get(path: string): Promise<Response> {
    return request("GET", path);
  }

  async function getJobId(): Promise<number> {
    const res = await get("/api/v1/job");
    if (res.status === 204) throw new Error("No active job");
    if (!res.ok) throw new Error(`getJob failed: ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await res.json()) as any;
    return body.id as number;
  }

  return {
    async getInfo() {
      const res = await get("/api/v1/info");
      if (!res.ok) throw new Error(`getInfo failed: ${res.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (await res.json()) as any;
      return { hostname: body.hostname as string };
    },

    async testConnection() {
      try {
        const res = await get("/api/v1/info");
        if (res.status === 401)
          return { ok: false, error: "Auth failed (401)" };
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true };
      } catch (err: unknown) {
        return { ok: false, error: (err as Error).message };
      }
    },

    async getStatus(): Promise<PrinterStatus> {
      const res = await get("/api/v1/status");
      if (!res.ok) throw new Error(`getStatus failed: ${res.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (await res.json()) as any;
      const p = body.printer;
      return {
        state: p.state,
        tempBed: p.temp_bed,
        targetBed: p.target_bed,
        tempNozzle: p.temp_nozzle,
        targetNozzle: p.target_nozzle,
        axisZ: p.axis_z,
        axisX: p.axis_x,
        axisY: p.axis_y,
        flow: p.flow,
        speed: p.speed,
        fanHotend: p.fan_hotend,
        fanPrint: p.fan_print,
      };
    },

    async getJob(): Promise<JobInfo | null> {
      const res = await get("/api/v1/job");
      if (res.status === 204) return null;
      if (!res.ok) throw new Error(`getJob failed: ${res.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (await res.json()) as any;
      return {
        id: body.id,
        state: body.state,
        progress: body.progress,
        timePrinting: body.time_printing,
        timeRemaining: body.time_remaining,
        fileName: body.file?.name ?? null,
        displayName: body.file?.display_name ?? null,
      };
    },

    async pause(): Promise<void> {
      const id = await getJobId();
      const res = await request("PUT", `/api/v1/job/${id}/pause`);
      if (res.status === 409)
        throw new Error("Conflict: invalid state transition");
      if (!res.ok) throw new Error(`pause failed: ${res.status}`);
    },

    async resume(): Promise<void> {
      const id = await getJobId();
      const res = await request("PUT", `/api/v1/job/${id}/resume`);
      if (res.status === 409)
        throw new Error("Conflict: invalid state transition");
      if (!res.ok) throw new Error(`resume failed: ${res.status}`);
    },

    async cancel(): Promise<void> {
      const id = await getJobId();
      const res = await request("DELETE", `/api/v1/job/${id}`);
      if (res.status === 409)
        throw new Error("Conflict: invalid state transition");
      if (!res.ok) throw new Error(`cancel failed: ${res.status}`);
    },

    async listFiles(): Promise<FileEntry[]> {
      throw new Error("not implemented");
    },

    async uploadFile(_filename: string, _stream: NodeJS.ReadableStream, _size: number): Promise<void> {
      throw new Error("not implemented");
    },

    async startPrint(_filename: string): Promise<void> {
      throw new Error("not implemented");
    },

    async deleteFile(_filename: string): Promise<void> {
      throw new Error("not implemented");
    },
  };
}
