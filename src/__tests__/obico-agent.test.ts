import { WebSocketServer, WebSocket } from "ws";
import { createObicoAgent } from "../obico/agent";
import { ObicoAgentConfig, PrusaLinkCommandDispatcher } from "../obico/types";
import { PrinterStatus, JobInfo } from "../prusalink/types";
import { buildStatusMessage } from "../obico/types";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getPort(): number {
  return 10000 + Math.floor(Math.random() * 5000);
}

function mockResponse(status: number, body?: object): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body ?? {}),
    text: () => Promise.resolve(body ? JSON.stringify(body) : ""),
  } as unknown as Response;
}

const mockFetch = jest.fn();
const mockHttp = { fetch: mockFetch };

const mockDispatcher: PrusaLinkCommandDispatcher = {
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  cancel: jest.fn().mockResolvedValue(undefined),
};

const idleStatus: PrinterStatus = {
  state: "IDLE",
  tempBed: 25.0,
  targetBed: 0,
  tempNozzle: 26.0,
  targetNozzle: 0,
  axisZ: 0,
  axisX: 0,
  axisY: 0,
  flow: 100,
  speed: 100,
  fanHotend: 0,
  fanPrint: 0,
};

const printingStatus: PrinterStatus = { ...idleStatus, state: "PRINTING" };

const activeJob: JobInfo = {
  id: 1,
  state: "PRINTING",
  progress: 42.5,
  timePrinting: 1800,
  timeRemaining: 2400,
  fileName: "benchy.gcode",
  displayName: "benchy_0.2mm.gcode",
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// buildStatusMessage() — pure function, no I/O
// ──────────────────────────────────────────────────────────────────────────────

describe("buildStatusMessage()", () => {
  it("reflects IDLE state correctly", () => {
    const msg = buildStatusMessage(idleStatus, null);
    expect(msg.status.state.text).toBe("Operational");
    expect(msg.status.state.flags.ready).toBe(true);
    expect(msg.status.state.flags.printing).toBe(false);
    expect(msg.current_print_ts).toBe(-1);
    expect(msg.status.job.file.name).toBeNull();
  });

  it("reflects PRINTING state with job info", () => {
    const msg = buildStatusMessage(printingStatus, activeJob);
    expect(msg.status.state.text).toBe("Printing");
    expect(msg.status.state.flags.printing).toBe(true);
    expect(msg.current_print_ts).not.toBeNull();
    expect(msg.status.job.file.name).toBe("benchy.gcode");
    expect(msg.status.progress.completion).toBe(42.5);
    expect(msg.status.temperatures.tool0.actual).toBe(26.0);
    expect(msg.status.temperatures.bed.actual).toBe(25.0);
  });

  it("reflects PAUSED state", () => {
    const msg = buildStatusMessage(
      { ...idleStatus, state: "PAUSED" },
      activeJob
    );
    expect(msg.status.state.flags.paused).toBe(true);
    expect(msg.status.state.flags.printing).toBe(false);
  });

  it("reflects ERROR state", () => {
    const msg = buildStatusMessage({ ...idleStatus, state: "ERROR" }, null);
    expect(msg.status.state.flags.error).toBe(true);
    expect(msg.status.state.error).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// startPairing() / waitForPairing()
// ──────────────────────────────────────────────────────────────────────────────

describe("startPairing()", () => {
  it("POSTs to /api/v1/octo/verify/ and returns pairing code", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { code: "AB123", expired_at: "2026-01-01T00:00:00Z" })
    );
    const agent = createObicoAgent(
      { serverUrl: "http://obico.local", apiKey: "" },
      mockHttp,
      mockDispatcher
    );
    const code = await agent.startPairing("http://obico.local");
    expect(code).toBe("AB123");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/octo/verify/"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws on non-200 response", async () => {
    mockFetch.mockResolvedValue(mockResponse(500));
    const agent = createObicoAgent(
      { serverUrl: "http://obico.local", apiKey: "" },
      mockHttp,
      mockDispatcher
    );
    await expect(agent.startPairing("http://obico.local")).rejects.toThrow();
  });
});

describe("waitForPairing()", () => {
  it("polls verify endpoint and returns auth_token when confirmed", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(202)) // not yet confirmed
      .mockResolvedValueOnce(
        mockResponse(200, {
          printer: { auth_token: "abc123def456abc1" },
          verified_at: "2026-01-01T00:00:00Z",
        })
      );
    const agent = createObicoAgent(
      { serverUrl: "http://obico.local", apiKey: "" },
      mockHttp,
      mockDispatcher
    );
    const token = await agent.waitForPairing("http://obico.local", "AB123");
    expect(token).toBe("abc123def456abc1");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws on 410 Gone (code expired)", async () => {
    mockFetch.mockResolvedValue(mockResponse(410));
    const agent = createObicoAgent(
      { serverUrl: "http://obico.local", apiKey: "" },
      mockHttp,
      mockDispatcher
    );
    await expect(
      agent.waitForPairing("http://obico.local", "AB123")
    ).rejects.toThrow(/expired/i);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// sendFrame()
// ──────────────────────────────────────────────────────────────────────────────

describe("sendFrame()", () => {
  it("POSTs binary JPEG to /api/v1/octo/pic/ with Token auth", async () => {
    mockFetch.mockResolvedValue(mockResponse(200));
    const agent = createObicoAgent(
      { serverUrl: "http://obico.local", apiKey: "test-key" },
      mockHttp,
      mockDispatcher
    );
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    await agent.sendFrame(jpeg);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://obico.local/api/v1/octo/pic/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Token test-key" }),
      })
    );
    const callArgs = mockFetch.mock.calls[0][1];
    const body = callArgs.body as FormData;
    expect(body.get("pic")).not.toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// WebSocket: connect / sendStatus / control dispatch
// ──────────────────────────────────────────────────────────────────────────────

describe("WebSocket", () => {
  let wss: WebSocketServer;
  let port: number;
  let serverSocket: WebSocket | null = null;

  beforeEach((done) => {
    port = getPort();
    serverSocket = null;
    wss = new WebSocketServer({ port });
    wss.on("connection", (ws) => {
      serverSocket = ws;
    });
    wss.on("listening", done);
  });

  afterEach((done) => {
    wss.close(done);
  });

  it("connects with Authorization bearer header", (done) => {
    const config: ObicoAgentConfig = {
      serverUrl: `http://localhost:${port}`,
      apiKey: "my-api-key",
    };
    wss.on("connection", (_ws, req) => {
      const authHeader = req.headers["authorization"] ?? "";
      expect(authHeader).toBe("bearer my-api-key");
      done();
    });
    const agent = createObicoAgent(config, mockHttp, mockDispatcher);
    agent.connect();
    setTimeout(() => agent.disconnect(), 200);
  });

  it("sendStatus() sends correct JSON over WebSocket", (done) => {
    const config: ObicoAgentConfig = {
      serverUrl: `http://localhost:${port}`,
      apiKey: "key",
    };
    const agent = createObicoAgent(config, mockHttp, mockDispatcher);
    agent.connect();

    // Wait for connection then send status
    setTimeout(() => {
      agent.sendStatus(idleStatus, null);
    }, 50);

    wss.on("connection", (ws) => {
      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        expect(msg.status).toBeDefined();
        expect(msg.status.state.text).toBe("Operational");
        agent.disconnect();
        done();
      });
    });
  });

  it("dispatches pause command to PrusaLink dispatcher", (done) => {
    const config: ObicoAgentConfig = {
      serverUrl: `http://localhost:${port}`,
      apiKey: "key",
    };
    const agent = createObicoAgent(config, mockHttp, mockDispatcher);
    agent.connect();

    wss.on("connection", (ws) => {
      setTimeout(() => {
        ws.send(
          JSON.stringify({
            passthru: {
              ref: "ref-1",
              target: "Printer",
              func: "pause",
              args: [],
              kwargs: {},
            },
          })
        );
      }, 50);
    });

    setTimeout(() => {
      expect(mockDispatcher.pause).toHaveBeenCalled();
      agent.disconnect();
      done();
    }, 200);
  });

  it("dispatches resume command", (done) => {
    const config: ObicoAgentConfig = {
      serverUrl: `http://localhost:${port}`,
      apiKey: "key",
    };
    const agent = createObicoAgent(config, mockHttp, mockDispatcher);
    agent.connect();

    wss.on("connection", (ws) => {
      setTimeout(() => {
        ws.send(
          JSON.stringify({
            passthru: {
              ref: "ref-2",
              target: "Printer",
              func: "resume",
              args: [],
              kwargs: {},
            },
          })
        );
      }, 50);
    });

    setTimeout(() => {
      expect(mockDispatcher.resume).toHaveBeenCalled();
      agent.disconnect();
      done();
    }, 200);
  });

  it("dispatches cancel command", (done) => {
    const config: ObicoAgentConfig = {
      serverUrl: `http://localhost:${port}`,
      apiKey: "key",
    };
    const agent = createObicoAgent(config, mockHttp, mockDispatcher);
    agent.connect();

    wss.on("connection", (ws) => {
      setTimeout(() => {
        ws.send(
          JSON.stringify({
            passthru: {
              ref: "ref-3",
              target: "Printer",
              func: "cancel",
              args: [],
              kwargs: {},
            },
          })
        );
      }, 50);
    });

    setTimeout(() => {
      expect(mockDispatcher.cancel).toHaveBeenCalled();
      agent.disconnect();
      done();
    }, 200);
  });
});
