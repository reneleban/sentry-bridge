import request from "supertest";
import express from "express";

// Mocks: loadConfig + createPrusaLinkClient
jest.mock("../config/config", () => ({
  loadConfig: jest.fn(() => ({
    prusalink: { url: "http://printer.local", username: "u", password: "p" },
    camera: { rtspUrl: "rtsp://x", frameIntervalSeconds: 10 },
    obico: { serverUrl: "http://obico", apiKey: "k" },
    polling: { statusIntervalMs: 5000 },
  })),
}));

const mockListFiles = jest.fn();
const mockUploadFile = jest.fn();
const mockDeleteFile = jest.fn();

jest.mock("../prusalink/client", () => ({
  createPrusaLinkClient: jest.fn(() => ({
    listFiles: mockListFiles,
    uploadFile: mockUploadFile,
    deleteFile: mockDeleteFile,
  })),
}));

// Test-App: nur filesRouter mounten, isoliert vom echten server.ts
function createTestApp() {
  const app = express();
  app.use(express.json());
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const filesRouter = require("../routes/files").default;
  app.use("/api/files", filesRouter);
  return app;
}

beforeEach(() => {
  mockListFiles.mockReset();
  mockUploadFile.mockReset();
  mockDeleteFile.mockReset();
});

describe("GET /api/files (FILES-01)", () => {
  it("returns OctoPrint-format file list", async () => {
    mockListFiles.mockResolvedValue([
      {
        name: "benchy.gcode",
        path: "benchy.gcode",
        size: 12345,
        date: "2025-01-15T10:30:00.000Z",
      },
    ]);
    const res = await request(createTestApp()).get("/api/files");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("files");
    expect(res.body).toHaveProperty("free", 0);
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.files).toHaveLength(1);
    const f = res.body.files[0];
    expect(f.name).toBe("benchy.gcode");
    expect(f.path).toBe("benchy.gcode");
    expect(f.type).toBe("machinecode");
    expect(f.typePath).toEqual(["machinecode", "gcode"]);
    expect(f.size).toBe(12345);
    expect(typeof f.date).toBe("number");
    expect(f.date).toBe(
      Math.floor(new Date("2025-01-15T10:30:00.000Z").getTime() / 1000)
    );
    expect(f.origin).toBe("local");
    expect(f.refs.resource).toBe("/api/files/benchy.gcode");
    expect(f.refs.download).toBe("/downloads/files/local/benchy.gcode");
    expect(f.gcodeAnalysis).toEqual({ estimatedPrintTime: null });
  });

  it("returns 502 when PrusaLink throws", async () => {
    mockListFiles.mockRejectedValue(new Error("upstream down"));
    const res = await request(createTestApp()).get("/api/files");
    expect(res.status).toBe(502);
    expect(res.body.message).toBe("upstream down");
  });

  it("URL-encodes special chars in refs", async () => {
    mockListFiles.mockResolvedValue([
      {
        name: "my file.gcode",
        path: "my file.gcode",
        size: 1,
        date: "2025-01-15T10:30:00.000Z",
      },
    ]);
    const res = await request(createTestApp()).get("/api/files");
    expect(res.body.files[0].refs.resource).toBe("/api/files/my%20file.gcode");
  });
});

describe("POST /api/files/upload (FILES-02)", () => {
  it("returns 200 and calls uploadFile with stream + size", async () => {
    mockUploadFile.mockResolvedValue(undefined);
    const res = await request(createTestApp())
      .post("/api/files/upload")
      .attach("file", Buffer.from("G28\nG1 X10\n"), "test.gcode");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    const call = mockUploadFile.mock.calls[0];
    expect(call[0]).toBe("test.gcode");
    expect(typeof call[1].pipe).toBe("function");
    expect(call[2]).toBe(11);
  });

  it("returns 400 when no file field provided", async () => {
    const res = await request(createTestApp())
      .post("/api/files/upload")
      .field("other", "value");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("No file provided");
  });

  it("returns 502 when uploadFile rejects", async () => {
    mockUploadFile.mockRejectedValue(new Error("printer disk full"));
    const res = await request(createTestApp())
      .post("/api/files/upload")
      .attach("file", Buffer.from("G28\n"), "test.gcode");
    expect(res.status).toBe(502);
    expect(res.body.message).toBe("printer disk full");
  });

  it("cleans up temp file after successful upload", async () => {
    const fs = require("node:fs");
    const tmpPathsSeen: string[] = [];
    mockUploadFile.mockImplementation((_name: string, stream: any) => {
      if (stream.path) tmpPathsSeen.push(String(stream.path));
      return Promise.resolve();
    });
    const res = await request(createTestApp())
      .post("/api/files/upload")
      .attach("file", Buffer.from("G28\n"), "test.gcode");
    expect(res.status).toBe(200);
    expect(tmpPathsSeen.length).toBe(1);
    await new Promise((r) => setTimeout(r, 50));
    expect(fs.existsSync(tmpPathsSeen[0])).toBe(false);
  });

  it("cleans up temp file when uploadFile rejects", async () => {
    const fs = require("node:fs");
    const tmpPathsSeen: string[] = [];
    mockUploadFile.mockImplementation((_name: string, stream: any) => {
      if (stream.path) tmpPathsSeen.push(String(stream.path));
      return Promise.reject(new Error("upload failed"));
    });
    await request(createTestApp())
      .post("/api/files/upload")
      .attach("file", Buffer.from("G28\n"), "test.gcode");
    await new Promise((r) => setTimeout(r, 50));
    expect(tmpPathsSeen.length).toBe(1);
    expect(fs.existsSync(tmpPathsSeen[0])).toBe(false);
  });
});

describe("DELETE /api/files/:name (FILES-04)", () => {
  it("returns 204 and calls deleteFile with basename", async () => {
    mockDeleteFile.mockResolvedValue(undefined);
    const res = await request(createTestApp()).delete(
      "/api/files/benchy.gcode"
    );
    expect(res.status).toBe(204);
    expect(mockDeleteFile).toHaveBeenCalledWith("benchy.gcode");
  });

  it("strips path traversal via basename", async () => {
    mockDeleteFile.mockResolvedValue(undefined);
    const res = await request(createTestApp()).delete(
      "/api/files/" + encodeURIComponent("../../etc/passwd")
    );
    expect([204, 400]).toContain(res.status);
    if (res.status === 204) {
      expect(mockDeleteFile).toHaveBeenCalledWith("passwd");
    }
  });

  it("returns 400 when name resolves to '.' or '..'", async () => {
    // encodeURIComponent("..") === ".." (dots are unreserved, not encoded).
    // Supertest/Node.js normalises /api/files/.. → /api/ before it reaches the server,
    // so the router never sees it.  Double-encode so the server receives %2E%2E as the
    // raw param value; decodeURIComponent then resolves to ".." inside the handler.
    const res = await request(createTestApp()).delete("/api/files/%252E%252E");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid filename");
  });

  it("returns 502 when deleteFile rejects", async () => {
    mockDeleteFile.mockRejectedValue(new Error("file locked"));
    const res = await request(createTestApp()).delete(
      "/api/files/benchy.gcode"
    );
    expect(res.status).toBe(502);
    expect(res.body.message).toBe("file locked");
  });
});
