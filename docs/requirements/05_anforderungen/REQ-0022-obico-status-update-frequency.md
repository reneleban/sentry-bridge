---
id: REQ-0022
legacy_id: NFR-P03
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0022: Obico status update frequency

## Description

Performance: Obico status update frequency.

## Rationale

Not documented.

## Acceptance Criteria

- Status JSON is sent to the Obico WebSocket on every PrusaLink poll tick (`polling.statusIntervalMs`, default 5 000 ms), so a printer state change reaches Obico within one poll interval; no separate routine timer exists.

## Related ADRs

None documented.
