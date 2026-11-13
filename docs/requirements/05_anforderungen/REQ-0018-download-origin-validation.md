---
id: REQ-0018
legacy_id: SRS-018
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0018: Download URL scheme validation

## Description

The system shall accept a file download URL received from Obico only if its scheme is `http` or `https`, and shall reduce the target file name to its basename before uploading the file to PrusaLink. The URL host is not compared with the configured Obico server; whether an origin check is needed is tracked as an open security question in #140.

## Rationale

Not documented.

## Acceptance Criteria

- A `file_downloader.download` passthru with a URL whose scheme is not `http:` or `https:` (e.g. `file:`) is rejected before any request is made; if the passthru has a `ref`, the bridge replies `{ ref, error: <reason> }`.
- A URL with an `http:` or `https:` scheme is fetched as given, from any host (see #140).
- `safe_filename` is reduced to its basename; an empty name, `.` or `..` is rejected.

## Related ADRs

None documented.
