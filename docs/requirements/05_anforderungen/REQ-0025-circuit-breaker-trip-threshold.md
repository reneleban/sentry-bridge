---
id: REQ-0025
legacy_id: NFR-R01
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0025: Circuit breaker trip threshold

## Description

Resilience: Circuit breaker trip threshold.

## Rationale

Not documented.

## Acceptance Criteria

- After `CIRCUIT_BREAKER_THRESHOLD` consecutive failures (default 5, configurable via environment variable), the circuit breaker opens and stops sending requests to the failing component

## Related ADRs

None documented.
