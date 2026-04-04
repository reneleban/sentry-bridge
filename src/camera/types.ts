export interface CameraConfig {
  rtspUrl: string;
  frameIntervalSeconds: number;
}

export interface CameraModule {
  start(): void;
  stop(): void;
  onFrame(callback: (frame: Buffer) => void): void;
  testStream(): Promise<Buffer>;
}
