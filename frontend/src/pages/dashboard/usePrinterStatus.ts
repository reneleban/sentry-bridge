import { useEffect, useState } from "react";

export interface PrinterStatus {
  state: string;
  tempNozzle: number;
  targetNozzle: number;
  tempBed: number;
  targetBed: number;
}

export interface JobInfo {
  fileName: string;
  displayName: string;
  progress: number;
  timePrinting: number;
  timeRemaining: number;
}

export interface StatusEvent {
  prusalink: { connected: boolean; error?: string };
  obico: { connected: boolean };
  camera: { connected: boolean };
  janus: {
    connected: boolean;
    available: boolean;
    mode: "external" | "embedded" | "unavailable";
  };
  printer: PrinterStatus | null;
  job: JobInfo | null;
}

export function usePrinterStatus() {
  const [status, setStatus] = useState<StatusEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/status/stream");

    es.addEventListener("status", (e) => {
      try {
        setStatus(JSON.parse(e.data) as StatusEvent);
        setError(null);
      } catch {
        setError("Failed to parse status");
      }
    });

    es.onerror = () => setError("Connection to server lost");

    return () => es.close();
  }, []);

  return { status, error };
}
