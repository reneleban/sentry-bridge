---
id: REQ-0016
legacy_id: SRS-016
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0016: OctoPrint-compatible file endpoints

## Description

The system shall expose the OctoPrint-compatible file list `GET /api/files` through the Obico HTTP tunnel so that Obico's file dialog can list the printer's files. Upload (`POST /api/files/upload`), print and delete are LAN-only (REQ-0015) and are not reachable through the tunnel (REQ-0032).

## Rationale

Not documented.

## Acceptance Criteria

- Obico's file browser tab shows the printer's file list.
- Tunnel requests other than `GET /api/files` (e.g. `POST /api/files/upload`, `DELETE /api/files/{name}`) are rejected.

## Related ADRs

None documented.
