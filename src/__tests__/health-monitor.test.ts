import {
  createHealthMonitor,
  ComponentName,
  HealthState,
} from "../lib/health-monitor";

jest.useFakeTimers();

describe("HealthMonitor", () => {
  describe("initial state", () => {
    it("all components start as healthy", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      const health = monitor.getHealth();
      expect(health.prusalink).toBe(HealthState.HEALTHY);
      expect(health.camera).toBe(HealthState.HEALTHY);
      expect(health.obico_ws).toBe(HealthState.HEALTHY);
      expect(health.janus).toBe(HealthState.HEALTHY);
      expect(health.rtp_stream).toBe(HealthState.HEALTHY);
      expect(health.janus_relay).toBe(HealthState.HEALTHY);
    });

    it("isCritical returns false initially", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      expect(monitor.isCritical()).toBe(false);
    });
  });

  describe("setState", () => {
    it("updates component state", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      monitor.setState("prusalink", HealthState.DEGRADED);
      expect(monitor.getHealth().prusalink).toBe(HealthState.DEGRADED);
    });

    it("emits change event on state update", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      const listener = jest.fn();
      monitor.on("change", listener);

      monitor.setState("camera", HealthState.DOWN);

      expect(listener).toHaveBeenCalledWith({
        component: "camera",
        state: HealthState.DOWN,
      });
    });

    it("does not emit if state unchanged", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      const listener = jest.fn();
      monitor.on("change", listener);

      monitor.setState("prusalink", HealthState.HEALTHY);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("isCritical", () => {
    it("returns false when critical component is down but within timeout", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      monitor.setState("obico_ws", HealthState.DOWN);
      jest.advanceTimersByTime(4999);
      expect(monitor.isCritical()).toBe(false);
    });

    it("returns true when critical component exceeds critical timeout", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      monitor.setState("camera", HealthState.DOWN);
      jest.advanceTimersByTime(5001);
      expect(monitor.isCritical()).toBe(true);
    });

    it("resets critical timer when component recovers", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      monitor.setState("camera", HealthState.DOWN);
      jest.advanceTimersByTime(3000);
      monitor.setState("camera", HealthState.HEALTHY);
      jest.advanceTimersByTime(3000);
      expect(monitor.isCritical()).toBe(false);
    });

    it("non-critical components (janus, rtp_stream, janus_relay) do not trigger isCritical", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      monitor.setState("janus", HealthState.DOWN);
      monitor.setState("rtp_stream", HealthState.DOWN);
      monitor.setState("janus_relay", HealthState.DOWN);
      jest.advanceTimersByTime(10000);
      expect(monitor.isCritical()).toBe(false);
    });
  });

  describe("getOverallState", () => {
    it("returns healthy when all components are healthy", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      expect(monitor.getOverallState()).toBe(HealthState.HEALTHY);
    });

    it("returns degraded when any component is degraded", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      monitor.setState("janus", HealthState.DEGRADED);
      expect(monitor.getOverallState()).toBe(HealthState.DEGRADED);
    });

    it("returns down when any component is down", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      monitor.setState("prusalink", HealthState.DOWN);
      expect(monitor.getOverallState()).toBe(HealthState.DOWN);
    });

    it("down takes precedence over degraded", () => {
      const monitor = createHealthMonitor({ criticalTimeoutMs: 5000 });
      monitor.setState("janus", HealthState.DEGRADED);
      monitor.setState("camera", HealthState.DOWN);
      expect(monitor.getOverallState()).toBe(HealthState.DOWN);
    });
  });
});
