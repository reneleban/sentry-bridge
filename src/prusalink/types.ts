export interface PrusaLinkConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export interface PrinterStatus {
  state:
    | "IDLE"
    | "BUSY"
    | "PRINTING"
    | "PAUSED"
    | "FINISHED"
    | "STOPPED"
    | "ERROR"
    | "ATTENTION";
  tempBed: number;
  targetBed: number;
  tempNozzle: number;
  targetNozzle: number;
  axisZ: number;
  axisX: number;
  axisY: number;
  flow: number;
  speed: number;
  fanHotend: number;
  fanPrint: number;
}

export interface JobInfo {
  id: number;
  state: "PRINTING" | "PAUSED" | "FINISHED" | "STOPPED" | "ERROR";
  progress: number;
  timePrinting: number;
  timeRemaining: number;
  fileName: string;
  displayName: string;
}

export interface PrusaLinkClient {
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  getStatus(): Promise<PrinterStatus>;
  getJob(): Promise<JobInfo | null>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancel(): Promise<void>;
}
