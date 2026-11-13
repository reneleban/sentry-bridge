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

The system shall validate the origin of file download URLs received from Obico to prevent SSRF attacks.

## Rationale

Not documented.

## Acceptance Criteria

- A `file_downloader.download` command with a URL from a host other than the configured Obico server is rejected with a logged error; no HTTP request is made to the foreign host.

## Related ADRs

None documented.
