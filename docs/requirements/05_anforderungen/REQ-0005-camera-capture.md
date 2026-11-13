---
id: REQ-0005
legacy_id: SRS-005
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0005: RTSP camera frame capture

## Description

The system shall capture the printer's RTSP camera stream via ffmpeg and extract JPEG frames at a configurable interval (default: 10 s).

## Rationale

Not documented.

## Acceptance Criteria

- The camera module emits at least one JPEG frame within 30 s of starting when the RTSP endpoint is reachable.

## Related ADRs

None documented.
