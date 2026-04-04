export interface CameraConfig {
  rtspUrl: string;
  frameIntervalSeconds: number;
}

export interface CameraModule {
  start(): void;
  stop(): void;
  onFrame(callback: (frame: Buffer) => void): void;
  subscribe(id: symbol, callback: (frame: Buffer) => void): void;
  unsubscribe(id: symbol): void;
  testStream(): Promise<Buffer>;
}
