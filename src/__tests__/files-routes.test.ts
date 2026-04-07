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
      { name: "benchy.gcode", path: "benchy.gcode", size: 12345, date: "2025-01-15T10:30:00.000Z" },
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
    expect(f.date).toBe(Math.floor(new Date("2025-01-15T10:30:00.000Z").getTime() / 1000));
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
      { name: "my file.gcode", path: "my file.gcode", size: 1, date: "2025-01-15T10:30:00.000Z" },
    ]);
    const res = await request(createTestApp()).get("/api/files");
    expect(res.body.files[0].refs.resource).toBe("/api/files/my%20file.gcode");
  });
});

describe.skip("POST /api/files/upload (FILES-02) — implemented in Plan 02", () => {});
describe.skip("DELETE /api/files/:name (FILES-04) — implemented in Plan 02", () => {});
