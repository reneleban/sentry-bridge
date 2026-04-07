import { createCircuitBreaker, CircuitState } from "../lib/circuit-breaker";

jest.useFakeTimers();

describe("CircuitBreaker", () => {
  describe("initial state", () => {
    it("starts CLOSED", () => {
      const cb = createCircuitBreaker({ threshold: 3, resetTimeoutMs: 1000 });
      expect(cb.state).toBe(CircuitState.CLOSED);
    });
  });

  describe("CLOSED → OPEN", () => {
    it("opens after threshold consecutive failures", async () => {
      const cb = createCircuitBreaker({ threshold: 3, resetTimeoutMs: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error("fail"));

      for (let i = 0; i < 3; i++) {
        await expect(cb.execute(fn)).rejects.toThrow("fail");
      }

      expect(cb.state).toBe(CircuitState.OPEN);
    });

    it("does not open before threshold is reached", async () => {
      const cb = createCircuitBreaker({ threshold: 3, resetTimeoutMs: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error("fail"));

      for (let i = 0; i < 2; i++) {
        await expect(cb.execute(fn)).rejects.toThrow("fail");
      }

      expect(cb.state).toBe(CircuitState.CLOSED);
    });

    it("resets failure count on success", async () => {
      const cb = createCircuitBreaker({ threshold: 3, resetTimeoutMs: 1000 });
      const fail = jest.fn().mockRejectedValue(new Error("fail"));
      const ok = jest.fn().mockResolvedValue("ok");

      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      await cb.execute(ok);
      await expect(cb.execute(fail)).rejects.toThrow();

      // only 1 failure after reset — still CLOSED
      expect(cb.state).toBe(CircuitState.CLOSED);
    });
  });

  describe("OPEN state", () => {
    it("rejects immediately without calling fn", async () => {
      const cb = createCircuitBreaker({ threshold: 2, resetTimeoutMs: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error("fail"));

      await expect(cb.execute(fn)).rejects.toThrow();
      await expect(cb.execute(fn)).rejects.toThrow();

      fn.mockResolvedValue("ok");
      await expect(cb.execute(fn)).rejects.toThrow("Circuit breaker is OPEN");
      expect(fn).toHaveBeenCalledTimes(2); // not called again
    });
  });

  describe("reset()", () => {
    it("transitions state back to CLOSED after being OPEN", async () => {
      const cb = createCircuitBreaker({ threshold: 2, resetTimeoutMs: 5000 });
      const fn = jest.fn().mockRejectedValue(new Error("fail"));

      await expect(cb.execute(fn)).rejects.toThrow();
      await expect(cb.execute(fn)).rejects.toThrow();
      expect(cb.state).toBe(CircuitState.OPEN);

      cb.reset();
      expect(cb.state).toBe(CircuitState.CLOSED);
    });

    it("sets failureCount to 0 after reset", async () => {
      const cb = createCircuitBreaker({ threshold: 2, resetTimeoutMs: 5000 });
      const fn = jest.fn().mockRejectedValue(new Error("fail"));

      await expect(cb.execute(fn)).rejects.toThrow();
      await expect(cb.execute(fn)).rejects.toThrow();

      cb.reset();
      expect(cb.stats.failureCount).toBe(0);
    });

    it("sets openedAt to null after reset", async () => {
      const cb = createCircuitBreaker({ threshold: 2, resetTimeoutMs: 5000 });
      const fn = jest.fn().mockRejectedValue(new Error("fail"));

      await expect(cb.execute(fn)).rejects.toThrow();
      await expect(cb.execute(fn)).rejects.toThrow();

      cb.reset();
      expect(cb.stats.openedAt).toBeNull();
    });

    it("is a no-op when breaker is already CLOSED", () => {
      const cb = createCircuitBreaker({ threshold: 3, resetTimeoutMs: 1000 });
      expect(cb.state).toBe(CircuitState.CLOSED);
      expect(() => cb.reset()).not.toThrow();
      expect(cb.state).toBe(CircuitState.CLOSED);
    });

    it("cancels the resetTimer so breaker does not later transition to HALF_OPEN", async () => {
      const cb = createCircuitBreaker({ threshold: 2, resetTimeoutMs: 5000 });
      const fn = jest.fn().mockRejectedValue(new Error("fail"));

      await expect(cb.execute(fn)).rejects.toThrow();
      await expect(cb.execute(fn)).rejects.toThrow();
      expect(cb.state).toBe(CircuitState.OPEN);

      cb.reset();
      expect(cb.state).toBe(CircuitState.CLOSED);

      // Advance time past resetTimeout — should NOT transition to HALF_OPEN since timer was cancelled
      jest.advanceTimersByTime(5000);
      expect(cb.state).toBe(CircuitState.CLOSED);
    });
  });

  describe("OPEN → HALF_OPEN → CLOSED", () => {
    it("transitions to HALF_OPEN after resetTimeout", async () => {
      const cb = createCircuitBreaker({ threshold: 2, resetTimeoutMs: 5000 });
      const fn = jest.fn().mockRejectedValue(new Error("fail"));

      await expect(cb.execute(fn)).rejects.toThrow();
      await expect(cb.execute(fn)).rejects.toThrow();
      expect(cb.state).toBe(CircuitState.OPEN);

      jest.advanceTimersByTime(5000);
      expect(cb.state).toBe(CircuitState.HALF_OPEN);
    });

    it("closes on successful test request in HALF_OPEN", async () => {
      const cb = createCircuitBreaker({ threshold: 2, resetTimeoutMs: 5000 });
      const fail = jest.fn().mockRejectedValue(new Error("fail"));
      const ok = jest.fn().mockResolvedValue("ok");

      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      jest.advanceTimersByTime(5000);

      await cb.execute(ok);
      expect(cb.state).toBe(CircuitState.CLOSED);
    });

    it("reopens on failed test request in HALF_OPEN", async () => {
      const cb = createCircuitBreaker({ threshold: 2, resetTimeoutMs: 5000 });
      const fail = jest.fn().mockRejectedValue(new Error("fail"));

      await expect(cb.execute(fail)).rejects.toThrow();
      await expect(cb.execute(fail)).rejects.toThrow();
      jest.advanceTimersByTime(5000);
      expect(cb.state).toBe(CircuitState.HALF_OPEN);

      await expect(cb.execute(fail)).rejects.toThrow();
      expect(cb.state).toBe(CircuitState.OPEN);
    });
  });
});
