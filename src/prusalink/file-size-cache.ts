import type { FileEntry, PrusaLinkClient } from "./types";

// #122: PrusaLink's USB file list has no sizes; only the per-file endpoint has
// them. Sizes are cached in memory by name + date and looked up in the
// background (never awaited by callers), at most 3 at a time, without
// duplicate in-flight lookups. Failed lookups are not cached and are retried
// on the next listing. Entries for files no longer listed are dropped.
const LOOKUP_CONCURRENCY = 3;

export type SizeLookup = (name: string) => Promise<number>;

export interface FileSizeCache {
  /** Cached sizes for `entries` (null if unknown); schedules missing lookups.
   *  `entries` must be the full file list (used to drop stale entries). */
  get(entries: FileEntry[], lookup: SizeLookup): Array<number | null>;
  /** Subscribe to sizes becoming known. Returns an unsubscribe function. */
  onSize(cb: (name: string, size: number) => void): () => void;
}

export function createFileSizeCache(): FileSizeCache {
  const sizes = new Map<string, { date: string; size: number }>();
  const queued = new Map<string, { entry: FileEntry; lookup: SizeLookup }>();
  const inFlight = new Set<string>();
  const listeners = new Set<(name: string, size: number) => void>();
  const key = (e: FileEntry) => `${e.name}\n${e.date}`;

  function pump(): void {
    while (inFlight.size < LOOKUP_CONCURRENCY && queued.size > 0) {
      const [k, { entry, lookup }] = queued.entries().next().value!;
      queued.delete(k);
      inFlight.add(k);
      lookup(entry.name)
        .then((size) => {
          sizes.set(entry.name, { date: entry.date, size });
          for (const cb of listeners) cb(entry.name, size);
        })
        .catch(() => undefined)
        .finally(() => {
          inFlight.delete(k);
          pump();
        });
    }
  }

  return {
    get(entries, lookup) {
      const names = new Set(entries.map((e) => e.name));
      for (const name of sizes.keys()) {
        if (!names.has(name)) sizes.delete(name);
      }
      const result = entries.map((e) => {
        const cached = sizes.get(e.name);
        if (cached && cached.date === e.date) return cached.size;
        if (!inFlight.has(key(e))) queued.set(key(e), { entry: e, lookup });
        return null;
      });
      pump();
      return result;
    },
    onSize(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

/** Process-wide cache shared by the Obico agent, /api/files and the SSE stream. */
export const fileSizeCache = createFileSizeCache();

/** Warms the cache at bridge start; never throws, failures are debug-logged. */
export async function prefetchFileSizes(
  client: Pick<PrusaLinkClient, "listFiles" | "getFileSize">,
  cache: FileSizeCache = fileSizeCache
): Promise<void> {
  try {
    const entries = await client.listFiles();
    cache.get(entries, (n) => client.getFileSize(n));
  } catch (err) {
    console.debug("[file-sizes] prefetch skipped:", err);
  }
}
