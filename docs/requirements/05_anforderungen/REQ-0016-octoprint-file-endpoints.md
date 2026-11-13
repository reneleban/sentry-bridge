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

The system shall expose OctoPrint-compatible file management endpoints (`GET /api/files`, `POST /api/files`, `DELETE /api/files/{path}`) to support Obico's remote file browser.

## Rationale

Not documented.

## Acceptance Criteria

- Obico's file browser tab shows the printer's file list.
- File upload via Obico completes for files up to 200 MB without an out-of-memory error.

## Related ADRs

None documented.
