import http from "http";
import { AddressInfo } from "net";
import { CameraModule } from "../camera/types";

let mockCamera: CameraModule | null = null;
jest.mock("../camera/registry", () => ({
  getCameraInstance: () => mockCamera,
  setCameraInstance: jest.fn(),
}));

import { app } from "../server";

type Sub = { onFrame: (f: Buffer) => void; onEnd: () => void };

function fakeCamera(): CameraModule & { subs: Map<symbol, Sub>; end(): void } {
  const subs = new Map<symbol, Sub>();
  return {
    subs,
    subscribe: (id: symbol, onFrame: (f: Buffer) => void, onEnd: () => void) =>
      subs.set(id, { onFrame, onEnd }),
    unsubscribe: (id: symbol) => subs.delete(id),
    end() {
      const all = [...subs.values()];
      subs.clear();
      all.forEach((s) => s.onEnd());
    },
  } as unknown as CameraModule & { subs: Map<symbol, Sub>; end(): void };
}

const frame = Buffer.from([0xff, 0xd8, 0x01, 0xff, 0xd9]);

describe("GET /stream", () => {
  let server: http.Server;
  let port: number;

  beforeAll((done) => {
    server = app.listen(0, () => {
      port = (server.address() as AddressInfo).port;
      done();
    });
  });
  afterAll((done) => {
    server.close(() => done());
  });

  function open(): Promise<http.IncomingMessage> {
    return new Promise((resolve, reject) => {
      http.get({ port, path: "/stream" }, resolve).on("error", reject);
    });
  }

  function waitForSubscriber(cam: { subs: Map<symbol, Sub> }): Promise<void> {
    return new Promise((resolve) => {
      const check = () => (cam.subs.size > 0 ? resolve() : setImmediate(check));
      check();
    });
  }

  it("ends the response when the camera stops", async () => {
    const cam = fakeCamera();
    mockCamera = cam;
    const res = await open();
    await waitForSubscriber(cam);
    const ended = new Promise<void>((resolve) => res.on("end", resolve));
    res.resume();
    cam.end();
    await ended;
  });

  it("streams frames from the new camera after the instance was replaced", async () => {
    const oldCam = fakeCamera();
    mockCamera = oldCam;
    const first = await open();
    await waitForSubscriber(oldCam);
    first.resume();
    oldCam.end();

    const newCam = fakeCamera();
    mockCamera = newCam;
    const res = await open();
    await waitForSubscriber(newCam);
    const data = new Promise<Buffer>((resolve) =>
      res.once("data", (d: Buffer) => resolve(d))
    );
    [...newCam.subs.values()][0].onFrame(frame);
    expect((await data).toString()).toContain("--mjpegframe");
    res.destroy();
  });
});
