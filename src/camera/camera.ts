import { spawn, ChildProcess } from "child_process";
import { CameraConfig, CameraModule } from "./types";
import { calculateDelay } from "../lib/retry";
import { resilienceConfig } from "../lib/env-config";
import { healthMonitor } from "../lib/health";
import { HealthState, ErrorSeverity } from "../lib/health-monitor";

export function createCamera(config: CameraConfig): CameraModule {
  let proc: ChildProcess | null = null;
  let rtpProc: ChildProcess | null = null;
  let frameCallback: ((frame: Buffer) => void) | null = null;
  const subscribers = new Map<symbol, (frame: Buffer) => void>();

  let mjpegStopped = false;
  let mjpegRestartAttempt = 0;
  let mjpegRestartTimer: ReturnType<typeof setTimeout> | null = null;

  let rtpStopped = false;
  let rtpRestartAttempt = 0;
  let rtpRestartTimer: ReturnType<typeof setTimeout> | null = null;
  let rtpPort: number | null = null;

  function emitFrame(frame: Buffer): void {
    if (frameCallback) frameCallback(frame);
    for (const cb of subscribers.values()) cb(frame);
  }

  function spawnFfmpeg(args: string[]): ChildProcess {
    return spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
  }

  function spawnMjpeg(): void {
    proc = spawnFfmpeg([
      "-rtsp_transport",
      "tcp",
      "-i",
      config.rtspUrl,
      "-vf",
      "fps=1",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "pipe:1",
    ]);

    const chunks: Buffer[] = [];
    proc.stdout!.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      const end = buf.lastIndexOf(Buffer.from([0xff, 0xd9]));
      if (end !== -1) {
        const frame = buf.subarray(0, end + 2);
        chunks.length = 0;
        const remainder = buf.subarray(end + 2);
        if (remainder.length > 0) chunks.push(remainder);
        mjpegRestartAttempt = 0;
        healthMonitor.setState("camera", HealthState.HEALTHY);
        emitFrame(frame);
      }
    });

    proc.on("close", (code) => {
      proc = null;
      if (mjpegStopped) return;
      const msg = `MJPEG stream exited (code ${code})`;
      console.log(`[camera] ${msg} — restarting`);
      healthMonitor.setState("camera", HealthState.RECOVERING);
      healthMonitor.pushError("camera", msg, ErrorSeverity.ERROR);
      healthMonitor.incrementRestarts("camera");
      const delay = calculateDelay(mjpegRestartAttempt, resilienceConfig.retry);
      mjpegRestartAttempt++;
      mjpegRestartTimer = setTimeout(() => spawnMjpeg(), delay);
    });
  }

  function spawnRtp(port: number): void {
    rtpProc = spawnFfmpeg([
      "-rtsp_transport",
      "tcp",
      "-i",
      config.rtspUrl,
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-tune",
      "zerolatency",
      "-profile:v",
      "baseline",
      "-level",
      "3.1",
      "-g",
      "30",
      "-b:v",
      "1500k",
      "-maxrate",
      "2000k",
      "-bufsize",
      "2000k",
      "-f",
      "rtp",
      `rtp://127.0.0.1:${port}?pkt_size=1300`,
    ]);
    rtpProc.stderr!.on("data", (d: Buffer) =>
      process.stderr.write(`[camera/rtp] ${d}`)
    );
    rtpProc.on("close", (code) => {
      rtpProc = null;
      if (rtpStopped) return;
      const msg = `RTP stream exited (code ${code})`;
      console.log(`[camera] ${msg} — restarting`);
      healthMonitor.setState("rtp_stream", HealthState.RECOVERING);
      healthMonitor.pushError("rtp_stream", msg, ErrorSeverity.ERROR);
      healthMonitor.incrementRestarts("rtp_stream");
      const delay = calculateDelay(rtpRestartAttempt, resilienceConfig.retry);
      rtpRestartAttempt++;
      rtpRestartTimer = setTimeout(() => spawnRtp(port), delay);
    });
    rtpRestartAttempt = 0;
    healthMonitor.setState("rtp_stream", HealthState.HEALTHY);
  }

  return {
    onFrame(callback: (frame: Buffer) => void): void {
      frameCallback = callback;
    },

    start(): void {
      if (proc) return;
      mjpegStopped = false;
      mjpegRestartAttempt = 0;
      spawnMjpeg();
    },

    stop(): void {
      mjpegStopped = true;
      if (mjpegRestartTimer) {
        clearTimeout(mjpegRestartTimer);
        mjpegRestartTimer = null;
      }
      if (proc) {
        proc.kill();
        proc = null;
      }
      healthMonitor.setState("camera", HealthState.DOWN);
    },

    subscribe(id: symbol, callback: (frame: Buffer) => void): void {
      subscribers.set(id, callback);
    },

    unsubscribe(id: symbol): void {
      subscribers.delete(id);
    },

    startRtpStream(port: number): void {
      if (rtpProc) return;
      rtpStopped = false;
      rtpPort = port;
      rtpRestartAttempt = 0;
      console.log(`[camera] Starting H.264 RTP stream → 127.0.0.1:${port}`);
      spawnRtp(port);
    },

    stopRtpStream(): void {
      rtpStopped = true;
      rtpPort = null;
      if (rtpRestartTimer) {
        clearTimeout(rtpRestartTimer);
        rtpRestartTimer = null;
      }
      if (rtpProc) {
        rtpProc.kill();
        rtpProc = null;
      }
      healthMonitor.setState("rtp_stream", HealthState.DOWN);
    },

    testStream(): Promise<Buffer> {
      return new Promise((resolve, reject) => {
        const p = spawnFfmpeg([
          "-rtsp_transport",
          "tcp",
          "-i",
          config.rtspUrl,
          "-frames:v",
          "1",
          "-update",
          "1",
          "-f",
          "image2pipe",
          "-vcodec",
          "mjpeg",
          "pipe:1",
        ]);

        const chunks: Buffer[] = [];
        p.stdout!.on("data", (chunk: Buffer) => chunks.push(chunk));

        p.on("error", (err) =>
          reject(new Error(`ffmpeg error: ${err.message}`))
        );

        p.on("close", (code) => {
          const buf = Buffer.concat(chunks);
          if (code !== 0 && buf.length === 0) {
            reject(new Error(`ffmpeg exited with code ${code}`));
            return;
          }
          resolve(buf);
        });
      });
    },
  };
}
