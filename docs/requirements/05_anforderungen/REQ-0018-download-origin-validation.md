---
id: REQ-0018
legacy_id: SRS-018
type: functional
source: Internal `PROJECT.md` (validated requirements), per the traceability note of the former functional requirements document
status: verified
priority: Not documented
---

# REQ-0018: Download URL origin validation

## Description

The system shall accept a file download URL received from Obico only if its scheme is `http` or `https` and its origin equals the configured Obico server origin or its hostname is listed in `obico.downloadAllowedHosts`, and shall reduce the target file name to its basename before uploading the file to PrusaLink.

## Rationale

Not documented.

## Acceptance Criteria

- A `file_downloader.download` passthru with a URL whose scheme is not `http:` or `https:` (e.g. `file:`) is rejected before any request is made; if the passthru has a `ref`, the bridge replies `{ ref, error: <reason> }`.
- A URL whose origin (scheme, host, port) differs from the configured Obico server URL and whose hostname is not in `obico.downloadAllowedHosts` (exact, case-insensitive) is rejected before any request is made, with a passthru error.
- Redirects are not followed automatically: each `Location` is checked against the same rule, at most 5 redirects are followed, and a disallowed target is rejected without being requested.
- `safe_filename` is reduced to its basename; an empty name, `.` or `..` is rejected.

## Related ADRs

None documented.
