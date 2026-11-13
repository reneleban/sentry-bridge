---
id: REQ-0026
legacy_id: NFR-R02
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0026: Circuit breaker reset timeout

## Description

Resilience: Circuit breaker reset timeout.

## Rationale

Not documented.

## Acceptance Criteria

- Circuit breaker transitions to HALF-OPEN after `CIRCUIT_BREAKER_RESET_TIMEOUT_MS` (default 60 000 ms, configurable via environment variable); if the probe succeeds, it transitions to CLOSED

## Related ADRs

None documented.
