import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { fileSizeCache } from "../prusalink/file-size-cache";

jest.mock("../config/config", () => ({
  loadConfig: jest.fn(() => {
    throw new Error("not configured");
  }),
}));
jest.mock("../bridge", () => ({ startBridge: jest.fn() }));

it("#122: /api/status/stream emits file-size when a size becomes known", (done) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const router = require("../routes/dashboard").dashboardRouter;
  const app = express();
  app.use("/api", router);
  const server = app.listen(0, () => {
    const { port } = server.address() as AddressInfo;
    http.get(`http://127.0.0.1:${port}/api/status/stream`, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk.toString();
        if (body.includes("event: file-size")) {
          expect(body).toContain(
            'event: file-size\ndata: {"name":"SSE.BGC","size":99}'
          );
          res.destroy();
          server.close();
          done();
        }
      });
      fileSizeCache.get(
        [
          {
            name: "SSE.BGC",
            displayName: "sse.bgcode",
            path: "/usb/SSE.BGC",
            size: 0,
            date: "2026-01-01T00:00:00.000Z",
          },
        ],
        () => Promise.resolve(99)
      );
    });
  });
});
