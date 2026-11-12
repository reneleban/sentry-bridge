import type { FileEntry } from "./types";

// OctoPrint-compatible file entry built from a PrusaLink file.
export interface OctoPrintFile {
  name: string;
  display: string;
  path: string;
  type: "machinecode";
  typePath: ["machinecode", "gcode"];
  size: number;
  date: number;
  origin: "local";
  refs: { resource: string; download: string };
  gcodeAnalysis: { estimatedPrintTime: number | null };
}

export function toOctoPrintFile(entry: FileEntry): OctoPrintFile {
  return {
    name: entry.name,
    display: entry.displayName,
    path: entry.path,
    type: "machinecode",
    typePath: ["machinecode", "gcode"],
    size: entry.size,
    date: Math.floor(new Date(entry.date).getTime() / 1000),
    origin: "local",
    refs: {
      resource: `/api/files/${encodeURIComponent(entry.name)}`,
      download: `/downloads/files/local/${encodeURIComponent(entry.name)}`,
    },
    gcodeAnalysis: { estimatedPrintTime: null },
  };
}
