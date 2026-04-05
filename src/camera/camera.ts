import { spawn, ChildProcess } from "child_process";
import { CameraConfig, CameraModule } from "./types";

export function createCamera(config: CameraConfig): CameraModule {
  let proc: ChildProcess | null = null;
  let rtpProc: ChildProcess | null = null;
  let frameCallback: ((frame: Buffer) => void) | null = null;
  const subscribers = new Map<symbol, (frame: Buffer) => void>();

  function emitFrame(frame: Buffer): void {
    if (frameCallback) frameCallback(frame);
    for (const cb of subscribers.values()) cb(frame);
  }

  function spawnFfmpeg(args: string[]): ChildProcess {
    return spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
  }

  return {
    onFrame(callback: (frame: Buffer) => void): void {
      frameCallback = callback;
    },

    start(): void {
      if (proc) return;
      // Always capture at 1fps for live stream; bridge throttles Obico uploads
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
        // JPEG ends with FF D9 — emit complete frame
        const buf = Buffer.concat(chunks);
        const end = buf.lastIndexOf(Buffer.from([0xff, 0xd9]));
        if (end !== -1) {
          const frame = buf.subarray(0, end + 2);
          chunks.length = 0;
          const remainder = buf.subarray(end + 2);
          if (remainder.length > 0) chunks.push(remainder);
          emitFrame(frame);
        }
      });

      proc.on("close", () => {
        proc = null;
      });
    },

    stop(): void {
      if (proc) {
        proc.kill();
        proc = null;
      }
    },

    subscribe(id: symbol, callback: (frame: Buffer) => void): void {
      subscribers.set(id, callback);
    },

    unsubscribe(id: symbol): void {
      subscribers.delete(id);
    },

    startRtpStream(port: number): void {
      if (rtpProc) return;
      console.log(`[camera] Starting H.264 RTP stream → 127.0.0.1:${port}`);
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
        console.log(`[camera] RTP stream exited (code ${code})`);
        rtpProc = null;
      });
    },

    stopRtpStream(): void {
      if (rtpProc) {
        rtpProc.kill();
        rtpProc = null;
      }
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
        p.stdout!.on("end", () => {
          // resolved on close to know the exit code
        });

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
