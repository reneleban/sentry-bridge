import { Config } from "../config/config";

// Non-blocking startup diagnostics (#13). The bridge starts regardless; these
// results only tell the user what to fix. Hints are i18n keys, never raw error
// text, so no secret can leak into a result.

export type BootCheckId =
  | "prusalink_reachable"
  | "prusalink_auth"
  | "camera_rtsp"
  | "obico_reachable"
  | "obico_paired";

export type BootCheckHint =
  | "prusalinkUnreachable"
  | "prusalinkAuth"
  | "cameraUnreachable"
  | "obicoUnreachable"
  | "obicoNotPaired";

export interface BootCheckResult {
  id: BootCheckId;
  ok: boolean;
  hint: BootCheckHint | null;
}

export interface BootCheckDeps {
  testPrusaLink(config: Config): Promise<{ ok: boolean; error?: string }>;
  /** Resolves with a frame, rejects when the stream is unreachable. */
  testCamera(rtspUrl: string): Promise<Buffer>;
  /** Resolves when the server answers any HTTP response, rejects otherwise. */
  reachObico(serverUrl: string): Promise<void>;
}

const succeeds = (p: Promise<unknown>) =>
  p.then(
    () => true,
    () => false
  );

export async function runBootChecks(
  config: Config,
  deps: BootCheckDeps
): Promise<BootCheckResult[]> {
  const [prusa, cameraOk, obicoOk] = await Promise.all([
    deps.testPrusaLink(config).catch(() => ({ ok: false, error: "" })),
    succeeds(deps.testCamera(config.camera.rtspUrl)),
    succeeds(deps.reachObico(config.obico.serverUrl)),
  ]);

  const authFailed = !prusa.ok && /\b401\b/.test(prusa.error ?? "");
  const reachable = prusa.ok || authFailed;
  const check = (id: BootCheckId, ok: boolean, hint: BootCheckHint) => ({
    id,
    ok,
    hint: ok ? null : hint,
  });

  return [
    check("prusalink_reachable", reachable, "prusalinkUnreachable"),
    check(
      "prusalink_auth",
      prusa.ok,
      reachable ? "prusalinkAuth" : "prusalinkUnreachable"
    ),
    check("camera_rtsp", cameraOk, "cameraUnreachable"),
    check("obico_reachable", obicoOk, "obicoUnreachable"),
    check("obico_paired", Boolean(config.obico.apiKey), "obicoNotPaired"),
  ];
}
