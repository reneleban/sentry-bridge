import * as fs from "node:fs";
import * as path from "node:path";
import { configPath } from "../config/config";
import type { FileEntry, PrusaLinkClient } from "./types";

// #122: PrusaLink's USB file list has no sizes; only the per-file endpoint has
// them. A printer with hundreds of files is easily overloaded, so:
// - sizes are looked up in the background (never awaited by callers), strictly
//   one at a time with a pause in between, so status polls and commands get through;
// - a failed or timed-out lookup stops the queue for a back-off period;
// - sizes are persisted (keyed by name + date) next to the config, so only new
//   or changed files are ever looked up; files no longer listed are dropped;
// - the file list itself is cached briefly, with concurrent callers sharing one request.
const DEFAULTS = {
  pauseMs: 500,
  backoffMs: 60_000,
  saveDebounceMs: 2_000,
  listTtlMs: 30_000,
};

export type SizeLookup = (name: string) => Promise<number>;

export interface FileSizeCacheOptions {
  /** JSON file for persisted sizes; omitted = memory only. */
  filePath?: string | (() => string);
  pauseMs?: number;
  backoffMs?: number;
  saveDebounceMs?: number;
  listTtlMs?: number;
}

export interface FileSizeCache {
  /** Cached sizes for `entries` (null if unknown); schedules missing lookups.
   *  `entries` must be the full file list (used to drop stale entries). */
  get(entries: FileEntry[], lookup: SizeLookup): Array<number | null>;
  /** The file list, cached for a short time; concurrent calls share one fetch. */
  list(fetch: () => Promise<FileEntry[]>): Promise<FileEntry[]>;
  /** Forget the cached file list, e.g. after an upload or delete. */
  invalidateList(): void;
  /** How many sizes of the last listing are known. */
  progress(): FileSizeProgress;
  /** Subscribe to progress changes after a size became known. */
  onProgress(cb: (p: FileSizeProgress) => void): () => void;
  /** Subscribe to sizes becoming known. Returns an unsubscribe function. */
  onSize(cb: (name: string, size: number) => void): () => void;
}

export interface FileSizeProgress {
  known: number;
  total: number;
}

type Sizes = Map<string, { date: string; size: number }>;

function loadSizes(filePath: string): Sizes {
  const sizes: Sizes = new Map();
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    for (const [name, v] of Object.entries(data ?? {})) {
      const rec = v as { date?: unknown; size?: unknown };
      if (typeof rec?.date === "string" && Number.isFinite(rec.size)) {
        sizes.set(name, { date: rec.date, size: rec.size as number });
      }
    }
  } catch {
    // missing or corrupt: start empty
  }
  return sizes;
}

function saveSizes(filePath: string, sizes: Sizes): void {
  // Temp file + rename: a crash mid-write never leaves a truncated file.
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(
      tmpPath,
      JSON.stringify(Object.fromEntries(sizes)),
      "utf-8"
    );
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error(
      "[file-sizes] could not save to",
      filePath,
      (err as Error).message
    );
  }
}

export function createFileSizeCache(
  options: FileSizeCacheOptions = {}
): FileSizeCache {
  const opts = { ...DEFAULTS, ...options };
  const resolvePath = (): string | undefined => {
    try {
      return typeof opts.filePath === "function"
        ? opts.filePath()
        : opts.filePath;
    } catch {
      return undefined;
    }
  };
  let sizes: Sizes | null = null;
  const queued = new Map<string, { entry: FileEntry; lookup: SizeLookup }>();
  let inFlight: string | null = null;
  let waiting = false;
  let saveTimer: NodeJS.Timeout | null = null;
  const listeners = new Set<(name: string, size: number) => void>();
  const progressListeners = new Set<(p: FileSizeProgress) => void>();
  let listed: FileEntry[] = [];
  const progress = (): FileSizeProgress => ({
    known: listed.filter((e) => store().get(e.name)?.date === e.date).length,
    total: listed.length,
  });
  let listCache: { at: number; entries: FileEntry[] } | null = null;
  let listInFlight: Promise<FileEntry[]> | null = null;
  const key = (e: FileEntry) => `${e.name}\n${e.date}`;

  function store(): Sizes {
    if (!sizes) {
      const p = resolvePath();
      sizes = p ? loadSizes(p) : new Map();
    }
    return sizes;
  }

  function scheduleSave(): void {
    const p = resolvePath();
    if (!p || saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveSizes(p, store());
    }, opts.saveDebounceMs);
    saveTimer.unref?.();
  }

  function resumeAfter(ms: number): void {
    waiting = true;
    setTimeout(() => {
      waiting = false;
      pump();
    }, ms).unref?.();
  }

  function pump(): void {
    if (inFlight || waiting || queued.size === 0) return;
    const [k, { entry, lookup }] = queued.entries().next().value!;
    queued.delete(k);
    inFlight = k;
    lookup(entry.name).then(
      (size) => {
        inFlight = null;
        store().set(entry.name, { date: entry.date, size });
        scheduleSave();
        for (const cb of listeners) cb(entry.name, size);
        const p = progress();
        for (const cb of progressListeners) cb(p);
        resumeAfter(opts.pauseMs);
      },
      (err) => {
        inFlight = null;
        console.debug(
          `[file-sizes] lookup failed, pausing ${opts.backoffMs} ms:`,
          (err as Error)?.message ?? err
        );
        resumeAfter(opts.backoffMs);
      }
    );
  }

  return {
    get(entries, lookup) {
      const known = store();
      listed = entries;
      const names = new Set(entries.map((e) => e.name));
      let dropped = false;
      for (const name of known.keys()) {
        if (!names.has(name)) {
          known.delete(name);
          dropped = true;
        }
      }
      if (dropped) scheduleSave();
      const result = entries.map((e) => {
        const cached = known.get(e.name);
        if (cached && cached.date === e.date) return cached.size;
        if (inFlight !== key(e)) queued.set(key(e), { entry: e, lookup });
        return null;
      });
      pump();
      return result;
    },
    list(fetch) {
      if (listCache && Date.now() - listCache.at < opts.listTtlMs) {
        return Promise.resolve(listCache.entries);
      }
      if (!listInFlight) {
        listInFlight = fetch()
          .then((entries) => {
            listCache = { at: Date.now(), entries };
            return entries;
          })
          .finally(() => {
            listInFlight = null;
          });
      }
      return listInFlight;
    },
    invalidateList() {
      listCache = null;
    },
    progress,
    onProgress(cb) {
      progressListeners.add(cb);
      return () => progressListeners.delete(cb);
    },
    onSize(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

/** file-sizes.json in the directory of the config file. */
export function fileSizesPath(): string {
  return path.join(path.dirname(configPath()), "file-sizes.json");
}

/** Process-wide cache shared by the Obico agent, /api/files and the SSE stream. */
export const fileSizeCache = createFileSizeCache({ filePath: fileSizesPath });

/** Warms the cache at bridge start; never throws, failures are debug-logged. */
export async function prefetchFileSizes(
  client: Pick<PrusaLinkClient, "listFiles" | "getFileSize">,
  cache: FileSizeCache = fileSizeCache
): Promise<void> {
  try {
    const entries = await cache.list(() => client.listFiles());
    cache.get(entries, (n) => client.getFileSize(n));
  } catch (err) {
    console.debug("[file-sizes] prefetch skipped:", err);
  }
}
