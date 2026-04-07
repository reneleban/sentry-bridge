import * as fs from "fs";
import * as path from "path";

describe("bridge.ts setInterval handle storage", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "bridge.ts"),
    "utf-8"
  );

  it("declares a pollHandle field in the BridgeState type or as a module-level variable", () => {
    // Matches either: let pollHandle: ReturnType<typeof setInterval> | null
    // or:             pollHandle: ReturnType<typeof setInterval> | null  (state object field)
    expect(source).toMatch(
      /pollHandle\s*:\s*ReturnType<typeof setInterval>\s*\|\s*null/
    );
  });

  it("assigns setInterval result to pollHandle (no bare unassigned setInterval(pollAndSend))", () => {
    // Matches either state.pollHandle = setInterval(pollAndSend, ...) or pollHandle = setInterval(pollAndSend, ...)
    expect(source).toMatch(/pollHandle\s*=\s*setInterval\(\s*pollAndSend/);
    // No bare unassigned setInterval(pollAndSend, ...) anywhere
    const bareCalls = source.match(/^\s*setInterval\(\s*pollAndSend/gm);
    expect(bareCalls).toBeNull();
  });

  it("clears pollHandle before re-creating in applyConfigChange", () => {
    expect(source).toMatch(/clearInterval\(\s*(?:state\.)?pollHandle\s*\)/);
  });
});
