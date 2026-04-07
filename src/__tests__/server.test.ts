import request from "supertest";
import { app } from "../server";

describe("GET /api/health", () => {
  it("returns component health detail", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("overall");
    expect(res.body).toHaveProperty("components");
  });

  it("/live returns 200", async () => {
    const res = await request(app).get("/api/health/live");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("/ready returns 200 when no critical component is down", async () => {
    const res = await request(app).get("/api/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
  });
});

describe("unknown routes", () => {
  it("returns 404", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
  });
});
