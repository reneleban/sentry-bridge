---
id: REQ-0029
legacy_id: NFR-R05
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0029: Critical health timeout

## Description

Resilience: Critical health timeout.

## Rationale

Not documented.

## Acceptance Criteria

- `GET /api/health/ready` returns 503 when any critical component has been DOWN for > 120 000 ms (configurable via `HEALTHCHECK_CRITICAL_TIMEOUT_MS`)

## Related ADRs

None documented.
