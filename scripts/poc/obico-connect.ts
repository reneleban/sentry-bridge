/**
 * POC: Validate Obico Agent Protocol
 *
 * Manually validates the protocol findings in docs/research/obico-agent-protocol.md
 * against a real Obico instance.
 *
 * Usage:
 *   OBICO_URL=http://paperbox:3334 npm run obico
 *
 * Steps:
 *   1. Go to Obico UI → Add Printer → copy the 6-char verification code
 *   2. Run this script, enter the code when prompted
 *   3. Script verifies code → receives API key
 *   4. Connects via WebSocket → sends one status message
 *   5. Check Obico UI → printer should appear as online
 */

import WebSocket from "ws";
import * as readline from "readline";

const OBICO_URL = process.env.OBICO_URL;

if (!OBICO_URL) {
  console.error("Error: OBICO_URL environment variable is required");
  console.error("Usage: OBICO_URL=http://paperbox:3334 npm run obico");
  process.exit(1);
}

const wsUrl = OBICO_URL.replace(/^http/, "ws") + "/ws/dev/";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function verifyCode(code: string): Promise<string> {
  console.log(`  POSTing to ${OBICO_URL}/api/v1/octo/verify/`);
  const res = await fetch(`${OBICO_URL}/api/v1/octo/verify/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const text = await res.text();
  console.log(`  Response status: ${res.status}`);
  console.log(`  Response body: ${text}`);

  if (!res.ok) {
    throw new Error(`Verification failed (${res.status}): ${text}`);
  }

  const body = JSON.parse(text) as { auth_token?: string };
  if (!body.auth_token) {
    throw new Error(`No auth_token in response: ${text}`);
  }
  return body.auth_token;
}

async function connectAndSendStatus(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`  Connecting to ${wsUrl}`);
    console.log(`  Auth header: authorization: bearer ${apiKey}`);

    const ws = new WebSocket(wsUrl, {
      headers: { authorization: `bearer ${apiKey}` },
    });

    ws.on("open", () => {
      console.log("  ✓ WebSocket connected");

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

      console.log("  Sending status message...");
      ws.send(JSON.stringify(statusMsg));
      console.log("  ✓ Status sent — check Obico UI for printer online status");
      console.log("  Listening for 10s for incoming control commands...");

      setTimeout(() => {
        ws.close();
        resolve();
      }, 10000);
    });

    ws.on("message", (data) => {
      console.log("  ← Received from Obico:", data.toString());
    });

    ws.on("error", (err) => {
      console.error("  WebSocket error:", err.message);
      reject(err);
    });

    ws.on("close", (code, reason) => {
      console.log(`  WebSocket closed (${code}: ${reason})`);
    });
  });
}

async function main() {
  console.log(`\nObico POC — connecting to ${OBICO_URL}`);
  console.log("=".repeat(50));

  console.log("\n▶ Step 1: Pairing");
  console.log("  → Go to Obico UI → Printers → Add Printer");
  console.log("  → Copy the verification code shown there");
  const code = await prompt("\n  Enter verification code: ");

  if (!code) {
    console.error("No code entered, aborting.");
    process.exit(1);
  }

  console.log("\n▶ Step 2: Verify code → get API key");
  const apiKey = await verifyCode(code);
  console.log(`  ✓ API key: ${apiKey}`);

  console.log("\n▶ Step 3: WebSocket connection + status message");
  await connectAndSendStatus(apiKey);

  console.log("\n✅ POC complete\n");
}

main().catch((err) => {
  console.error("\n❌ POC failed:", err.message);
  process.exit(1);
});
