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

The system shall apply circuit breaker protection to the PrusaLink, Obico WebSocket, and camera connections.

## Rationale

Not documented.

## Acceptance Criteria

- After 5 consecutive failures on a connection, the circuit breaker opens.
- The dashboard health UI reflects the open state.
- The breaker resets after 60 s or on manual reconnect.

## Related ADRs

None documented.
