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
  fileName: string | null; // null wenn serieller Druck (kein file-Feld in Response)
  displayName: string | null; // null wenn serieller Druck
}

export interface PrinterInfo {
  hostname: string;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  date: string; // ISO-String
}

export interface PrusaLinkClient {
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  getInfo(): Promise<PrinterInfo>;
  getStatus(): Promise<PrinterStatus>;
  getJob(): Promise<JobInfo | null>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancel(): Promise<void>;
  listFiles(): Promise<FileEntry[]>;
  uploadFile(
    filename: string,
    stream: NodeJS.ReadableStream,
    size: number
  ): Promise<void>;
  startPrint(filename: string): Promise<void>;
  deleteFile(filename: string): Promise<void>;
}
