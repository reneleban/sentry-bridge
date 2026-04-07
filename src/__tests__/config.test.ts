import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { loadConfig, saveConfig, isConfigured, configEmitter, Config } from "../config/config";

const validConfig = {
  prusalink: {
    url: "http://192.168.x.x",
    username: "maker",
    password: "secret",
  },
  camera: { rtspUrl: "rtsp://192.168.x.x/live", frameIntervalSeconds: 2 },
  obico: { serverUrl: "http://192.168.1.100:3334", apiKey: "abc123" },
  polling: { statusIntervalMs: 2000 },
};

function withTempConfig(content: string, fn: (filePath: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obico-test-"));
  const filePath = path.join(dir, "config.json");
  fs.writeFileSync(filePath, content, "utf-8");
  try {
    fn(filePath);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
}

describe("loadConfig()", () => {
  it("parses a valid config file", () => {
    withTempConfig(JSON.stringify(validConfig), (filePath) => {
      process.env.CONFIG_PATH = filePath;
      const config = loadConfig();
      expect(config.prusalink.url).toBe("http://192.168.x.x");
      expect(config.camera.frameIntervalSeconds).toBe(2);
      expect(config.obico.serverUrl).toBe("http://192.168.1.100:3334");
      expect(config.polling.statusIntervalMs).toBe(2000);
    });
  });

  it("throws a clear error when file is missing", () => {
    process.env.CONFIG_PATH = "/nonexistent/config.json";
    expect(() => loadConfig()).toThrow("Config file not found");
  });

  it("throws a clear error when JSON is invalid", () => {
    withTempConfig("not valid json {{{", (filePath) => {
      process.env.CONFIG_PATH = filePath;
      expect(() => loadConfig()).toThrow("Config file contains invalid JSON");
    });
  });
});

describe("saveConfig()", () => {
  it("writes the correct JSON structure to the config path", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obico-test-"));
    const filePath = path.join(dir, "config.json");
    process.env.CONFIG_PATH = filePath;
    try {
      saveConfig(validConfig);
      const written = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(written).toEqual(validConfig);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});

describe("isConfigured()", () => {
  it("returns false when config file does not exist", () => {
    process.env.CONFIG_PATH = "/nonexistent/config.json";
    expect(isConfigured()).toBe(false);
  });

  it("returns false when required fields are missing", () => {
    const incomplete = {
      prusalink: { url: "", username: "", password: "" },
      camera: { rtspUrl: "", frameIntervalSeconds: 2 },
      obico: { serverUrl: "", apiKey: "" },
      polling: { statusIntervalMs: 2000 },
    };
    withTempConfig(JSON.stringify(incomplete), (filePath) => {
      process.env.CONFIG_PATH = filePath;
      expect(isConfigured()).toBe(false);
    });
  });

  it("returns true when all required fields are present", () => {
    withTempConfig(JSON.stringify(validConfig), (filePath) => {
      process.env.CONFIG_PATH = filePath;
      expect(isConfigured()).toBe(true);
    });
  });
});

describe("configEmitter", () => {
  it("emits 'config-changed' with the new config after saveConfig", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obico-test-"));
    const filePath = path.join(dir, "config.json");
    process.env.CONFIG_PATH = filePath;
    const received: Config[] = [];
    const handler = (cfg: Config) => received.push(cfg);
    configEmitter.on("config-changed", handler);
    try {
      saveConfig(validConfig);
      expect(received).toHaveLength(1);
      expect(received[0].prusalink.url).toBe("http://192.168.x.x");
    } finally {
      configEmitter.off("config-changed", handler);
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("does not emit when fs.writeFileSync throws", () => {
    process.env.CONFIG_PATH = "/nonexistent-dir/config.json";
    const received: Config[] = [];
    const handler = (cfg: Config) => received.push(cfg);
    configEmitter.on("config-changed", handler);
    try {
      expect(() => saveConfig(validConfig)).toThrow();
      expect(received).toHaveLength(0);
    } finally {
      configEmitter.off("config-changed", handler);
    }
  });
});
