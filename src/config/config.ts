import * as fs from "fs";

export interface Config {
  prusalink: { url: string; username: string; password: string };
  camera: { rtspUrl: string; frameIntervalSeconds: number };
  obico: { serverUrl: string; apiKey: string };
  polling: { statusIntervalMs: number };
}

function configPath(): string {
  return process.env.CONFIG_PATH ?? "/config/config.json";
}

export function loadConfig(): Config {
  const filePath = configPath();

  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");

  try {
    return JSON.parse(raw) as Config;
  } catch {
    throw new Error(`Config file contains invalid JSON: ${filePath}`);
  }
}

export function saveConfig(config: Config): void {
  const filePath = configPath();
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");
}

export function isConfigured(): boolean {
  try {
    const config = loadConfig();
    return !!(
      config.prusalink?.url &&
      config.prusalink?.username &&
      config.prusalink?.password &&
      config.camera?.rtspUrl &&
      config.obico?.serverUrl &&
      config.obico?.apiKey
    );
  } catch {
    return false;
  }
}
