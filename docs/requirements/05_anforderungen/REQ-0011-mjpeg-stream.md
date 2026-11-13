---
id: REQ-0011
legacy_id: SRS-011
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0011: MJPEG stream endpoint

## Description

The system shall provide an MJPEG snapshot stream endpoint (`/stream`) for compatibility with Obico's snapshot-based monitoring.

## Rationale

Not documented.

## Acceptance Criteria

- A browser or HTTP client can consume `GET /stream` and receive a continuous MJPEG stream while the camera is running.

## Related ADRs

None documented.
