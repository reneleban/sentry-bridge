---
id: REQ-0010
legacy_id: SRS-010
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0010: Live dashboard

## Description

The system shall provide a live dashboard showing printer connection status, camera preview, and print controls (pause/resume/cancel).

## Rationale

Not documented.

## Acceptance Criteria

- The dashboard updates printer state within 2× the polling interval.
- Camera preview shows a frame not older than 2× the frame interval.
- The camera image shows a status dot with fps and frame age; the stream reconnects on its own when no frame arrives for a while or after the camera was replaced, stopped or unreachable (#84, #9).

## Related ADRs

None documented.
