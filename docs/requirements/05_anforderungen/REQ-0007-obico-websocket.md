---
id: REQ-0007
legacy_id: SRS-007
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0007: Persistent Obico WebSocket

## Description

The system shall maintain a persistent WebSocket connection to the Obico server using the OctoPrint agent protocol.

## Rationale

Not documented.

## Acceptance Criteria

- After an initial pairing, the bridge reconnects automatically within 60 s of a WebSocket disconnect without manual intervention.
- After the Obico circuit breaker opened, the bridge reconnects on its own once Obico is reachable again, without a restart (#127).

## Related ADRs

None documented.
