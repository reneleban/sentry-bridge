import { Config, tryLoadConfig } from "../config/config";
import { createPrusaLinkClient } from "../prusalink/client";
import { createCamera } from "../camera/camera";
import { BootCheckDeps, BootCheckResult, runBootChecks } from "./checks";

export interface BootCheckReport {
  checkedAt: string | null;
  results: BootCheckResult[];
}

const OBICO_TIMEOUT_MS = 5000;

// Same probes the setup wizard uses (PrusaLink testConnection, camera
// testStream); Obico only needs to answer any HTTP response.
const liveDeps: BootCheckDeps = {
  testPrusaLink: (c: Config) =>
    createPrusaLinkClient({
      baseUrl: c.prusalink.url,
      username: c.prusalink.username,
      password: c.prusalink.password,
    }).testConnection(),
  testCamera: (rtspUrl) =>
    createCamera({ rtspUrl, frameIntervalSeconds: 10 }).testStream(),
  reachObico: async (serverUrl) => {
    await fetch(serverUrl, { signal: AbortSignal.timeout(OBICO_TIMEOUT_MS) });
  },
};

let report: BootCheckReport = { checkedAt: null, results: [] };
let inFlight: Promise<BootCheckReport> | null = null;

export function getBootCheckReport(): BootCheckReport {
  return report;
}

/** Runs all checks once; concurrent callers share the same run. Resolves
 *  null when the bridge is not configured. */
export function runAndStoreBootChecks(
  config: Config | null = tryLoadConfig()
): Promise<BootCheckReport | null> {
  if (!config) return Promise.resolve(null);
  if (!inFlight) {
    inFlight = runBootChecks(config, liveDeps)
      .then((results) => {
        report = { checkedAt: new Date().toISOString(), results };
        return report;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
