---
id: REQ-0041
legacy_id: none
type: non-functional
source: "#112 / PR #118"
status: implemented
priority: Not documented
---

# REQ-0041: PrusaLink request timeouts

## Description

Resilience: The system shall abort PrusaLink requests that do not complete in time instead of waiting indefinitely.

## Rationale

Not documented.

## Acceptance Criteria

- A PrusaLink request that does not complete within 10 s is aborted; file uploads are aborted after 10 minutes.
- An aborted request is treated like a network error: PrusaLink health is set to DOWN and the failure counts toward the `prusalink` circuit breaker (REQ-0004, REQ-0013).

## Related ADRs

None documented.
