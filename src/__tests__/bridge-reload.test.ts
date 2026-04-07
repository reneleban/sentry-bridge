import { diffConfig } from "../bridge";
import { Config } from "../config/config";

const base: Config = {
  prusalink: {
    url: "http://192.168.x.x",
    username: "maker",
    password: "secret",
  },
  camera: { rtspUrl: "rtsp://192.168.x.x/live", frameIntervalSeconds: 2 },
  obico: { serverUrl: "http://192.168.1.100:3334", apiKey: "abc123" },
  polling: { statusIntervalMs: 5000 },
};

describe("diffConfig()", () => {
  it("returns all false when configs are identical", () => {
    expect(diffConfig(base, base)).toEqual({
      prusalink: false,
      obico: false,
      camera: false,
      polling: false,
    });
  });

  it("detects prusalink credential change", () => {
    const next = { ...base, prusalink: { ...base.prusalink, password: "new" } };
    expect(diffConfig(base, next).prusalink).toBe(true);
  });

  it("detects prusalink url change", () => {
    const next = { ...base, prusalink: { ...base.prusalink, url: "http://192.168.1.99" } };
    expect(diffConfig(base, next).prusalink).toBe(true);
  });

  it("detects obico serverUrl change", () => {
    const next = { ...base, obico: { ...base.obico, serverUrl: "http://new" } };
    expect(diffConfig(base, next).obico).toBe(true);
  });

  it("detects obico apiKey change", () => {
    const next = { ...base, obico: { ...base.obico, apiKey: "newkey" } };
    expect(diffConfig(base, next).obico).toBe(true);
  });

  it("detects camera rtspUrl change", () => {
    const next = { ...base, camera: { ...base.camera, rtspUrl: "rtsp://new/live" } };
    expect(diffConfig(base, next).camera).toBe(true);
  });

  it("detects camera frameIntervalSeconds change", () => {
    const next = { ...base, camera: { ...base.camera, frameIntervalSeconds: 99 } };
    expect(diffConfig(base, next).camera).toBe(true);
  });

  it("detects polling statusIntervalMs change (06-D6)", () => {
    const next = { ...base, polling: { statusIntervalMs: 9999 } };
    expect(diffConfig(base, next).polling).toBe(true);
  });

  it("returns prusalink false when only camera changes", () => {
    const next = { ...base, camera: { ...base.camera, rtspUrl: "rtsp://new/live" } };
    expect(diffConfig(base, next).prusalink).toBe(false);
  });

  it("returns camera false when only polling changes", () => {
    const next = { ...base, polling: { statusIntervalMs: 9999 } };
    expect(diffConfig(base, next).camera).toBe(false);
  });
});
