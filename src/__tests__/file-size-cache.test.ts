import { createFileSizeCache } from "../prusalink/file-size-cache";
import type { FileEntry } from "../prusalink/types";

const entry = (name: string, date = "2026-01-01T00:00:00.000Z"): FileEntry => ({
  name,
  displayName: name,
  path: `/usb/${name}`,
  size: 0,
  date,
});
const flush = () => new Promise((r) => setImmediate(r));

describe("file size cache (#122)", () => {
  it("returns null for unknown sizes immediately and fills them in the background", async () => {
    const cache = createFileSizeCache();
    const lookup = jest.fn().mockResolvedValue(42);
    const seen: Array<[string, number]> = [];
    cache.onSize((name, size) => seen.push([name, size]));
    expect(cache.get([entry("A")], lookup)).toEqual([null]);
    await flush();
    expect(seen).toEqual([["A", 42]]);
    expect(cache.get([entry("A")], lookup)).toEqual([42]);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("does not start a duplicate lookup while one is in flight", async () => {
    const cache = createFileSizeCache();
    let resolve!: (n: number) => void;
    const lookup = jest.fn(() => new Promise<number>((r) => (resolve = r)));
    cache.get([entry("A")], lookup);
    cache.get([entry("A")], lookup);
    expect(lookup).toHaveBeenCalledTimes(1);
    resolve(1);
    await flush();
  });

  it("runs at most 3 lookups in parallel", async () => {
    const cache = createFileSizeCache();
    const resolvers: Array<() => void> = [];
    const lookup = jest.fn(
      () => new Promise<number>((r) => resolvers.push(() => r(1)))
    );
    cache.get(
      ["A", "B", "C", "D", "E"].map((n) => entry(n)),
      lookup
    );
    expect(lookup).toHaveBeenCalledTimes(3);
    resolvers.shift()!();
    await flush();
    expect(lookup).toHaveBeenCalledTimes(4);
  });

  it("re-fetches when the date changes and retries failed lookups", async () => {
    const cache = createFileSizeCache();
    const lookup = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(7);
    cache.get([entry("A")], lookup);
    await flush();
    expect(cache.get([entry("A")], lookup)).toEqual([null]);
    await flush();
    expect(cache.get([entry("A")], lookup)).toEqual([7]);
    expect(cache.get([entry("A", "2026-02-01T00:00:00.000Z")], lookup)).toEqual(
      [null]
    );
    expect(lookup).toHaveBeenCalledTimes(3);
  });
});

describe("prefetchFileSizes (#122)", () => {
  it("looks up sizes of all listed files in the background", async () => {
    const { prefetchFileSizes } = await import("../prusalink/file-size-cache");
    const cache = createFileSizeCache();
    const getFileSize = jest.fn().mockResolvedValue(5);
    await prefetchFileSizes(
      { listFiles: jest.fn().mockResolvedValue([entry("A")]), getFileSize },
      cache
    );
    await flush();
    expect(cache.get([entry("A")], getFileSize)).toEqual([5]);
  });

  it("ignores a failing file list", async () => {
    const { prefetchFileSizes } = await import("../prusalink/file-size-cache");
    const debug = jest.spyOn(console, "debug").mockImplementation(() => {});
    await expect(
      prefetchFileSizes(
        {
          listFiles: jest.fn().mockRejectedValue(new Error("down")),
          getFileSize: jest.fn(),
        },
        createFileSizeCache()
      )
    ).resolves.toBeUndefined();
    debug.mockRestore();
  });
});
