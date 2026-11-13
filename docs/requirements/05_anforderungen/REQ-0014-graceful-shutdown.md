---
id: REQ-0014
legacy_id: SRS-014
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0014: Graceful SIGTERM shutdown

## Description

The system shall handle SIGTERM by closing the HTTP server, disconnecting the Obico WebSocket, and stopping the camera (ffmpeg) within 8 s.

## Rationale

Not documented.

## Acceptance Criteria

- `docker stop` completes within 10 s.
- No orphaned ffmpeg processes remain after shutdown.
- A hard exit timer ends the process after 8 s if the orderly shutdown hangs (`src/bridge.ts`).
- ffmpeg children that ignore SIGTERM are killed with SIGKILL after 5 s (`src/lib/terminate.ts`).

## Related ADRs

None documented.
