/**
 * POC: Validate Obico Agent Protocol
 *
 * Manually validates the protocol findings in docs/research/obico-agent-protocol.md
 * against a real Obico instance.
 *
 * Usage:
 *   OBICO_URL=http://192.168.1.x:3334 npx ts-node scripts/poc-obico-connect.ts
 *
 * Steps:
 *   1. Start pairing → prints a 5-char code
 *   2. Go to Obico UI → add printer → enter code
 *   3. Script polls for confirmation → prints API key
 *   4. Connects via WebSocket → sends one status message
 *   5. Check Obico UI → printer should appear as online
 */

import WebSocket from "ws";
import * as readline from "readline";

const OBICO_URL = process.env.OBICO_URL;

if (!OBICO_URL) {
  console.error("Error: OBICO_URL environment variable is required");
  console.error(
    "Usage: OBICO_URL=http://192.168.1.x:3334 npx ts-node scripts/poc-obico-connect.ts"
  );
  process.exit(1);
}

const wsUrl = OBICO_URL.replace(/^http/, "ws") + "/ws/dev/";

async function step(label: string, fn: () => Promise<void>) {
  console.log(`\n▶ ${label}`);
  await fn();
  console.log(`  ✓ done`);
}

async function requestPairingCode(): Promise<string> {
  // The pairing code is generated server-side — user enters it in Obico UI.
  // We use the discovery endpoint to initiate.
  const res = await fetch(`${OBICO_URL}/api/v1/octo/discovery/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host_or_ip: "127.0.0.1", device_id: "poc-test" }),
  });
  const body = (await res.json()) as { code?: string };
  if (!body.code) {
    throw new Error(`Discovery response had no code: ${JSON.stringify(body)}`);
  }
  return body.code;
}

async function pollForApiKey(code: string): Promise<string> {
  const MAX_ATTEMPTS = 60;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${OBICO_URL}/api/v1/octo/verify/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      const body = (await res.json()) as { auth_token?: string };
      if (body.auth_token) return body.auth_token;
    }
    process.stdout.write(`  waiting... (${i + 1}/${MAX_ATTEMPTS})\r`);
  }
  throw new Error("Pairing confirmation timed out after 3 minutes");
}

async function connectAndSendStatus(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, {
      headers: { authorization: `bearer ${apiKey}` },
    });

    ws.on("open", () => {
      console.log(`  Connected to ${wsUrl}`);

      const statusMsg = {
        current_print_ts: null,
        status: {
          _ts: Math.floor(Date.now() / 1000),
          state: {
            text: "Operational",
            flags: {
              operational: true,
              paused: false,
              printing: false,
              error: false,
              ready: true,
            },
            error: null,
          },
          job: { file: { name: null, path: null, obico_g_code_file_id: null } },
          progress: {
            completion: null,
            filepos: null,
            printTime: null,
            printTimeLeft: null,
          },
          temperatures: {},
        },
      };

      ws.send(JSON.stringify(statusMsg));
      console.log("  Status message sent — check Obico UI for printer");
      console.log("  Waiting 5s for control commands...");

      setTimeout(() => {
        ws.close();
        resolve();
      }, 5000);
    });

    ws.on("message", (data) => {
      console.log("  Received message from Obico:", data.toString());
    });

    ws.on("error", reject);
    ws.on("close", () => console.log("  WebSocket closed"));
  });
}

async function main() {
  console.log(`\nObico POC — connecting to ${OBICO_URL}`);
  console.log("=".repeat(50));

  let apiKey: string;

  await step("Step 1: Request pairing code", async () => {
    const code = await requestPairingCode();
    console.log(`\n  ┌─────────────────────────┐`);
    console.log(`  │  Pairing code: ${code.padEnd(9)}│`);
    console.log(`  └─────────────────────────┘`);
    console.log(`  → Go to Obico UI → Add Printer → enter this code`);

    apiKey = await pollForApiKey(code);
    console.log(`\n  API key received: ${apiKey}`);
  });

  await step("Step 2: Connect via WebSocket + send status", async () => {
    await connectAndSendStatus(apiKey!);
  });

  console.log("\n✅ POC complete — protocol findings validated\n");
}

main().catch((err) => {
  console.error("\n❌ POC failed:", err.message);
  process.exit(1);
});
