import { withRetry, calculateDelay } from "../lib/retry";

jest.useFakeTimers();

describe("calculateDelay", () => {
  it("returns baseDelay on first attempt", () => {
    const delay = calculateDelay(0, {
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      jitter: false,
    });
    expect(delay).toBe(1000);
  });

  it("doubles delay on each attempt", () => {
    const opts = { baseDelayMs: 1000, maxDelayMs: 30000, jitter: false };
    expect(calculateDelay(1, opts)).toBe(2000);
    expect(calculateDelay(2, opts)).toBe(4000);
    expect(calculateDelay(3, opts)).toBe(8000);
  });

  it("caps at maxDelayMs", () => {
    const opts = { baseDelayMs: 1000, maxDelayMs: 5000, jitter: false };
    expect(calculateDelay(10, opts)).toBe(5000);
  });

  it("adds jitter when enabled (result <= delay)", () => {
    const opts = { baseDelayMs: 1000, maxDelayMs: 30000, jitter: true };
    for (let i = 0; i < 20; i++) {
      const delay = calculateDelay(1, opts);
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(2000);
    }
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  // Use 0ms delays so tests run instantly without fake timer complexity
  const opts = { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 };

  it("returns result on first success", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, opts);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and returns on eventual success", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, opts);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after maxAttempts exhausted", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("always fails"));
    await expect(withRetry(fn, opts)).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects maxAttempts: 1 (no retries)", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("fail"));
    await expect(withRetry(fn, { ...opts, maxAttempts: 1 })).rejects.toThrow(
      "fail"
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
