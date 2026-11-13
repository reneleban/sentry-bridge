---
id: REQ-0013
legacy_id: SRS-013
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0013: Circuit breaker protection

## Description

The system shall apply circuit breaker protection to the PrusaLink, Obico WebSocket, Obico frame upload, and camera connections (breakers `prusalink`, `obico_ws`, `obico_frames`, `camera`).

## Rationale

Not documented.

## Acceptance Criteria

- After `CIRCUIT_BREAKER_THRESHOLD` consecutive failures (default 5) on a connection, the circuit breaker opens.
- The dashboard health UI reflects the open state.
- The breaker resets after `CIRCUIT_BREAKER_RESET_TIMEOUT_MS` (default 60 000 ms) or on manual reconnect.

## Related ADRs

None documented.
