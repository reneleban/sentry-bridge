---
id: REQ-0031
legacy_id: NFR-S02
type: non-functional
source: Not documented
status: Not documented
priority: Not documented
---

# REQ-0031: SSRF mitigation for file download

## Description

Security: SSRF mitigation for file download. The current mitigation is limited to a scheme check; an origin check against the configured Obico server is not implemented and is tracked in #140.

## Rationale

Not documented.

## Acceptance Criteria

- `file_downloader.download` only fetches URLs with an `http:` or `https:` scheme; any other scheme is rejected and reported as a passthru error (`{ ref, error }`), not as an HTTP status.
- The download target name is reduced to its basename (path traversal mitigation).
- Open question (#140): the URL host is not checked against the configured Obico server URL.

## Related ADRs

None documented.
