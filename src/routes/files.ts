import { Router, Request, Response } from "express";
import { loadConfig } from "../config/config";
import { createPrusaLinkClient } from "../prusalink/client";
import type { FileEntry } from "../prusalink/types";

const router = Router();

interface OctoPrintFile {
  name: string;
  path: string;
  type: "machinecode";
  typePath: ["machinecode", "gcode"];
  size: number;
  date: number;
  origin: "local";
  refs: { resource: string; download: string };
  gcodeAnalysis: { estimatedPrintTime: number | null };
}

function toPrusaLinkFileEntry(entry: FileEntry): OctoPrintFile {
  return {
    name: entry.name,
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

// GET /api/files — FILES-01
router.get("/", async (_req: Request, res: Response) => {
  try {
    const config = loadConfig();
    const client = createPrusaLinkClient({
      baseUrl: config.prusalink.url,
      username: config.prusalink.username,
      password: config.prusalink.password,
    });
    const entries = await client.listFiles();
    const files = entries.map(toPrusaLinkFileEntry);
    res.json({ files, free: 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list files";
    res.status(502).json({ message });
  }
});

export default router;
