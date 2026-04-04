import { CameraModule } from "./types";

let instance: CameraModule | null = null;

export function setCameraInstance(camera: CameraModule): void {
  instance = camera;
}

export function getCameraInstance(): CameraModule | null {
  return instance;
}
