export interface BridgeState {
  activePrintFileId: number | null;
}

export function createBridgeState(): BridgeState {
  return { activePrintFileId: null };
}
