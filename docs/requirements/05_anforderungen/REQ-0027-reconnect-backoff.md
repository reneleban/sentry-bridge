---
id: REQ-0027
legacy_id: NFR-R03
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0027: Reconnect backoff

## Description

Resilience: Reconnect backoff.

## Rationale

Not documented.

## Acceptance Criteria

- Reconnect delay starts at `RETRY_BASE_DELAY_MS` (default 1 000 ms), doubles per attempt, caps at `RETRY_MAX_DELAY_MS` (default 30 000 ms); both are configurable via environment variables.
- After the Obico circuit breaker opened (e.g. Obico server down for an update), the WebSocket reconnects on its own once Obico is reachable again, without a container restart (#127).

## Related ADRs

None documented.
