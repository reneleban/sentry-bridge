import { createBridgeState } from "../bridge/state";

describe("createBridgeState()", () => {
  it("returns activePrintFileId === null", () => {
    const state = createBridgeState();
    expect(state.activePrintFileId).toBeNull();
  });

  it("state is mutable: assigning activePrintFileId persists", () => {
    const state = createBridgeState();
    state.activePrintFileId = 123;
    expect(state.activePrintFileId).toBe(123);
  });

  it("multiple instances are independent", () => {
    const a = createBridgeState();
    const b = createBridgeState();
    a.activePrintFileId = 42;
    expect(b.activePrintFileId).toBeNull();
  });
});
