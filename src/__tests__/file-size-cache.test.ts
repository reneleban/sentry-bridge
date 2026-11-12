import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  createFileSizeCache,
  prefetchFileSizes,
  type FileSizeCacheOptions,
} from "../prusalink/file-size-cache";
import type { FileEntry } from "../prusalink/types";

const entry = (name: string, date = "2026-01-01T00:00:00.000Z"): FileEntry => ({
  name,
  displayName: name,
  path: `/usb/${name}`,
  size: 0,
  date,
});
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "file-sizes-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const fast = (extra: FileSizeCacheOptions = {}) =>
  createFileSizeCache({
    filePath: path.join(dir, "file-sizes.json"),
    pauseMs: 5,
    backoffMs: 50,
    saveDebounceMs: 5,
    listTtlMs: 30,
    ...extra,
  });

describe("file size cache (#122)", () => {
  it("returns null for unknown sizes immediately and fills them in the background", async () => {
    const cache = fast();
    const lookup = jest.fn().mockResolvedValue(42);
    const seen: Array<[string, number]> = [];
    cache.onSize((name, size) => seen.push([name, size]));
    expect(cache.get([entry("A")], lookup)).toEqual([null]);
    await wait(20);
    expect(seen).toEqual([["A", 42]]);
    expect(cache.get([entry("A")], lookup)).toEqual([42]);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("looks up one file at a time with a pause between lookups", async () => {
    const cache = fast({ pauseMs: 40 });
    const resolvers: Array<() => void> = [];
    const lookup = jest.fn(
      () => new Promise<number>((r) => resolvers.push(() => r(1)))
    );
    cache.get(
      ["A", "B", "C"].map((n) => entry(n)),
      lookup
    );
    cache.get(
      ["A", "B", "C"].map((n) => entry(n)),
      lookup
    );
    expect(lookup).toHaveBeenCalledTimes(1);
    resolvers.shift()!();
    await wait(10);
    expect(lookup).toHaveBeenCalledTimes(1);
    await wait(50);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("re-fetches a file whose date changed", async () => {
    const cache = fast();
    const lookup = jest.fn().mockResolvedValue(7);
    cache.get([entry("A")], lookup);
    await wait(20);
    expect(cache.get([entry("A", "2026-02-01T00:00:00.000Z")], lookup)).toEqual(
      [null]
    );
    await wait(20);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("persists sizes and only looks up new files after a restart", async () => {
    const first = fast();
    first.get([entry("A")], jest.fn().mockResolvedValue(11));
    await wait(40);
    const second = fast();
    const lookup = jest.fn().mockResolvedValue(22);
    expect(second.get([entry("A"), entry("B")], lookup)).toEqual([11, null]);
    await wait(40);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("B");
  });

  it("drops entries of files no longer listed from the persisted file", async () => {
    const cache = fast();
    cache.get([entry("A"), entry("B")], jest.fn().mockResolvedValue(1));
    await wait(40);
    cache.get([entry("B")], jest.fn());
    await wait(20);
    const reloaded = fast();
    const lookup = jest.fn().mockResolvedValue(2);
    expect(reloaded.get([entry("A"), entry("B")], lookup)).toEqual([null, 1]);
  });

  it("treats a missing or corrupt file as empty", () => {
    fs.writeFileSync(path.join(dir, "file-sizes.json"), "{oops");
    expect(fast().get([entry("A")], jest.fn().mockResolvedValue(1))).toEqual([
      null,
    ]);
  });

  it("backs off after a failed lookup instead of continuing", async () => {
    const cache = fast({ backoffMs: 60 });
    const lookup = jest
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue(3);
    cache.get([entry("A"), entry("B")], lookup);
    await wait(30);
    cache.get([entry("A"), entry("B")], lookup);
    await wait(10);
    expect(lookup).toHaveBeenCalledTimes(1);
    await wait(80);
    expect(cache.get([entry("A"), entry("B")], lookup)).toEqual([3, 3]);
  });
});

describe("fill progress (#122)", () => {
  it("reports known / total of the last listing and notifies on change", async () => {
    const cache = fast();
    const seen: Array<{ known: number; total: number }> = [];
    cache.onProgress((p) => seen.push(p));
    expect(cache.progress()).toEqual({ known: 0, total: 0 });
    cache.get([entry("A"), entry("B")], jest.fn().mockResolvedValue(1));
    expect(cache.progress()).toEqual({ known: 0, total: 2 });
    await wait(40);
    expect(cache.progress()).toEqual({ known: 2, total: 2 });
    expect(seen).toEqual([
      { known: 1, total: 2 },
      { known: 2, total: 2 },
    ]);
  });
});

describe("file list cache (#122)", () => {
  it("shares one in-flight request and reuses the list within the TTL", async () => {
    const cache = fast({ listTtlMs: 40 });
    const fetch = jest.fn().mockResolvedValue([entry("A")]);
    const [a, b] = await Promise.all([cache.list(fetch), cache.list(fetch)]);
    expect(a).toEqual([entry("A")]);
    expect(b).toEqual([entry("A")]);
    await cache.list(fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    await wait(60);
    await cache.list(fetch);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("re-fetches after invalidateList and does not cache failures", async () => {
    const cache = fast();
    const fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValue([]);
    await expect(cache.list(fetch)).rejects.toThrow("down");
    await cache.list(fetch);
    cache.invalidateList();
    await cache.list(fetch);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("prefetchFileSizes (#122)", () => {
  it("looks up sizes of all listed files in the background", async () => {
    const cache = fast();
    const getFileSize = jest.fn().mockResolvedValue(5);
    await prefetchFileSizes(
      { listFiles: jest.fn().mockResolvedValue([entry("A")]), getFileSize },
      cache
    );
    await wait(20);
    expect(cache.get([entry("A")], getFileSize)).toEqual([5]);
  });

  it("ignores a failing file list", async () => {
    const debug = jest.spyOn(console, "debug").mockImplementation(() => {});
    await expect(
      prefetchFileSizes(
        {
          listFiles: jest.fn().mockRejectedValue(new Error("down")),
          getFileSize: jest.fn(),
        },
        fast()
      )
    ).resolves.toBeUndefined();
    debug.mockRestore();
  });
});
