---
id: REQ-0015
legacy_id: SRS-015
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0015: G-code file management

## Description

The system shall list, upload, print, and delete G-code files on the connected PrusaLink storage.

## Rationale

Not documented.

## Acceptance Criteria

- A file uploaded via the dashboard (`POST /api/files/upload`) appears in the file list.
- Selecting "Print" starts the file on the printer.
- Delete removes it from both the list and PrusaLink.
- Upload, print and delete are available on the LAN only, not through the Obico tunnel (REQ-0032).

## Related ADRs

None documented.
