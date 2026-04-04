import DigestFetch from "digest-fetch";
import {
  JobInfo,
  PrinterStatus,
  PrusaLinkClient,
  PrusaLinkConfig,
} from "./types";

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

  async function get(path: string): Promise<Response> {
    return http.fetch(`${base}${path}`, { method: "GET" });
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
        fileName: body.file.name,
        displayName: body.file.display_name,
      };
    },

    async pause(): Promise<void> {
      const id = await getJobId();
      const res = await http.fetch(`${base}/api/v1/job/${id}/pause`, {
        method: "PUT",
      });
      if (res.status === 409)
        throw new Error("Conflict: invalid state transition");
      if (!res.ok) throw new Error(`pause failed: ${res.status}`);
    },

    async resume(): Promise<void> {
      const id = await getJobId();
      const res = await http.fetch(`${base}/api/v1/job/${id}/resume`, {
        method: "PUT",
      });
      if (res.status === 409)
        throw new Error("Conflict: invalid state transition");
      if (!res.ok) throw new Error(`resume failed: ${res.status}`);
    },

    async cancel(): Promise<void> {
      const id = await getJobId();
      const res = await http.fetch(`${base}/api/v1/job/${id}`, {
        method: "DELETE",
      });
      if (res.status === 409)
        throw new Error("Conflict: invalid state transition");
      if (!res.ok) throw new Error(`cancel failed: ${res.status}`);
    },
  };
}
