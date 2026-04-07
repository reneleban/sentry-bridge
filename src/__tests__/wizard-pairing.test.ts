import request from "supertest";
import express from "express";
import { wizardRouter } from "../routes/wizard";
import * as agentModule from "../obico/agent";

jest.mock("../obico/agent");

describe("POST /api/wizard/verify-pairing", () => {
  let app: express.Express;
  let waitForPairing: jest.Mock;

  beforeEach(() => {
    waitForPairing = jest.fn();
    (agentModule.createObicoAgent as jest.Mock).mockReturnValue({
      waitForPairing,
    });
    app = express();
    app.use(express.json());
    app.use("/api/wizard", wizardRouter);
  });

  it("returns 200 with apiKey on successful pairing", async () => {
    waitForPairing.mockResolvedValue("token-abc-123");
    const res = await request(app)
      .post("/api/wizard/verify-pairing")
      .send({ obicoServerUrl: "http://obico.local", code: "AB123" });
    expect(res.status).toBe(200);
    expect(res.body.apiKey).toBe("token-abc-123");
    expect(waitForPairing).toHaveBeenCalledWith("http://obico.local", "AB123");
  });

  it("returns 504 with timeout message when waitForPairing rejects with timeout", async () => {
    waitForPairing.mockRejectedValue(new Error("Pairing timed out after 120s"));
    const res = await request(app)
      .post("/api/wizard/verify-pairing")
      .send({ obicoServerUrl: "http://obico.local", code: "AB123" });
    expect(res.status).toBe(504);
    expect(res.body.message).toMatch(/timed out/i);
  });

  it("returns 410 when waitForPairing rejects with expired", async () => {
    waitForPairing.mockRejectedValue(new Error("Pairing code expired"));
    const res = await request(app)
      .post("/api/wizard/verify-pairing")
      .send({ obicoServerUrl: "http://obico.local", code: "AB123" });
    expect(res.status).toBe(410);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("returns 400 when obicoServerUrl or code missing", async () => {
    const res = await request(app).post("/api/wizard/verify-pairing").send({});
    expect(res.status).toBe(400);
  });
});
