---
id: REQ-0003
legacy_id: SRS-003
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0003: PrusaLink status and job polling

## Description

The system shall poll the PrusaLink status endpoint (`/api/v1/status`) and job endpoint (`/api/v1/job`) at a configurable interval (default: 5 s).

## Rationale

Not documented.

## Acceptance Criteria

- Printer state changes (IDLE → PRINTING) are reflected in the Obico dashboard within 2× the configured interval.

## Related ADRs

None documented.
