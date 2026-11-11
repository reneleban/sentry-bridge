import request from "supertest";

const mockConfig = {
  prusalink: { url: "http://printer", username: "maker", password: "pw" },
  camera: { rtspUrl: "rtsp://printer/live", frameIntervalSeconds: 10 },
  obico: { serverUrl: "http://obico", apiKey: "key" },
};
let mockConfigured = true;

jest.mock("../config/config", () => ({
  ...jest.requireActual("../config/config"),
  tryLoadConfig: () => (mockConfigured ? mockConfig : null),
}));
jest.mock("../prusalink/client", () => ({
  createPrusaLinkClient: () => ({
    testConnection: async () => ({ ok: false, error: "Auth failed (401)" }),
  }),
}));
jest.mock("../camera/camera", () => ({
  createCamera: () => ({ testStream: async () => Buffer.from("jpeg") }),
}));

import { app } from "../server";

beforeEach(() => {
  mockConfigured = true;
  global.fetch = jest.fn().mockResolvedValue({ status: 200 }) as never;
});

describe("/api/boot-checks", () => {
  it("returns no results before the first run", async () => {
    const res = await request(app).get("/api/boot-checks");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ checkedAt: null, results: [] });
  });

  it("POST re-runs the checks and GET returns the latest results", async () => {
    const post = await request(app).post("/api/boot-checks");
    expect(post.status).toBe(200);
    expect(post.body.checkedAt).toEqual(expect.any(String));
    const auth = post.body.results.find(
      (r: { id: string }) => r.id === "prusalink_auth"
    );
    expect(auth).toEqual({
      id: "prusalink_auth",
      ok: false,
      hint: "prusalinkAuth",
    });

    const get = await request(app).get("/api/boot-checks");
    expect(get.body).toEqual(post.body);
  });

  it("POST returns 409 when the bridge is not configured", async () => {
    mockConfigured = false;
    const res = await request(app).post("/api/boot-checks");
    expect(res.status).toBe(409);
  });
});
