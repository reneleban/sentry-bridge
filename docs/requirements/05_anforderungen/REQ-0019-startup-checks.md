---
id: REQ-0019
legacy_id: SRS-019
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0019: Startup and on-demand checks

## Description

The system shall check PrusaLink reachability and credentials, the camera RTSP stream, Obico reachability and pairing at startup and on demand, without blocking bridge start.

## Rationale

Not documented.

## Acceptance Criteria

- With a wrong PrusaLink password the dashboard shows the credentials check as failed with a fix hint while the bridge keeps running; "Re-check" re-runs all checks.

## Related ADRs

None documented.
