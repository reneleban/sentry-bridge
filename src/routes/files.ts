import { Router, Request, Response, NextFunction } from "express";
import { loadConfig } from "../config/config";
import { createPrusaLinkClient } from "../prusalink/client";
import type { FileEntry } from "../prusalink/types";
import multer from "multer";
import { createReadStream, unlink } from "node:fs";
import { basename } from "node:path";

const upload = multer({
  storage: multer.diskStorage({
    destination: "/tmp",
    filename: (_req, file, cb) =>
      cb(null, `upload-${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
});

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

// POST /api/files/upload — FILES-02
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ message: "No file provided" });
      return;
    }
    const tmpPath = req.file.path;
    const originalName = req.file.originalname;
    const size = req.file.size;
    try {
      const config = loadConfig();
      const client = createPrusaLinkClient({
        baseUrl: config.prusalink.url,
        username: config.prusalink.username,
        password: config.prusalink.password,
      });
      const stream = createReadStream(tmpPath);
      await client.uploadFile(originalName, stream, size);
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(502).json({ message });
    } finally {
      unlink(tmpPath, () => {
        /* ignore cleanup errors */
      });
    }
  }
);

// DELETE /api/files/:name — FILES-04
router.delete("/:name", async (req: Request, res: Response) => {
  const decoded = decodeURIComponent(String(req.params.name));
  const filename = basename(decoded);
  if (!filename || filename === "." || filename === "..") {
    res.status(400).json({ message: "Invalid filename" });
    return;
  }
  try {
    const config = loadConfig();
    const client = createPrusaLinkClient({
      baseUrl: config.prusalink.url,
      username: config.prusalink.username,
      password: config.prusalink.password,
    });
    await client.deleteFile(filename);
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    res.status(502).json({ message });
  }
});

// Multer-Fehler-Handler — muss nach den Routes stehen
// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (
    err instanceof multer.MulterError &&
    (err as multer.MulterError).code === "LIMIT_FILE_SIZE"
  ) {
    res.status(413).json({ message: "File too large (max 200 MB)" });
    return;
  }
  const message = err instanceof Error ? err.message : "Internal error";
  res.status(500).json({ message });
});

export default router;
